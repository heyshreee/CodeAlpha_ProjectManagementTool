import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  registerUser,
  loginUser,
  createProject,
  getBoard,
  createTask,
} from './helpers.js';

// Add an existing user to a project via the invite endpoint.
async function addMember(ownerToken, projectId, role, targetEmail) {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: targetEmail, role });
  return res;
}

async function makeProjectWithRoles() {
  const owner = await registerUser('RBAC Owner');
  const projId = await createProject(owner.token, 'RBAC Project');
  const members = {};

  for (const [key, role] of Object.entries({ admin: 'ADMIN', member: 'MEMBER', viewer: 'VIEWER' })) {
    const u = await registerUser(`RBAC ${role}`);
    const invited = await addMember(owner.token, projId, role, u.email);
    expect(invited.status).toBe(201);
    const login = await loginUser(u.email, u.password);
    expect(login.status).toBe(200);
    members[key] = login.body.data.accessToken;
  }

  const board = await getBoard(owner.token, projId);
  const columnId = board.columns[0].id;
  return { owner, projId, members, board, columnId };
}

describe('Authorization (RBAC) matrix', () => {
  it('owner can delete project; member/viewer/admin cannot', async () => {
    const { owner, projId, members } = await makeProjectWithRoles();

    for (const token of [members.viewer, members.member, members.admin]) {
      const res = await request(app)
        .delete(`/api/v1/projects/${projId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }

    const ownerDelete = await request(app)
      .delete(`/api/v1/projects/${projId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerDelete.status).toBe(200);
  });

  it('project update is ADMIN+ only', async () => {
    const { projId, members } = await makeProjectWithRoles();

    const viewer = await request(app)
      .patch(`/api/v1/projects/${projId}`)
      .set('Authorization', `Bearer ${members.viewer}`)
      .send({ name: 'hacked' });
    expect(viewer.status).toBe(403);

    const member = await request(app)
      .patch(`/api/v1/projects/${projId}`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ name: 'hacked' });
    expect(member.status).toBe(403);

    const admin = await request(app)
      .patch(`/api/v1/projects/${projId}`)
      .set('Authorization', `Bearer ${members.admin}`)
      .send({ name: 'renamed' });
    expect(admin.status).toBe(200);
    expect(admin.body.data.name).toBe('renamed');
  });

  it('viewer cannot create/update/delete tasks; member can', async () => {
    const { projId, members, columnId } = await makeProjectWithRoles();

    const createAsViewer = await request(app)
      .post(`/api/v1/projects/${projId}/tasks`)
      .set('Authorization', `Bearer ${members.viewer}`)
      .send({ title: 'nope', columnId });
    expect(createAsViewer.status).toBe(403);

    const createAsMember = await request(app)
      .post(`/api/v1/projects/${projId}/tasks`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ title: 'mine', columnId });
    expect(createAsMember.status).toBe(201);
    const taskId = createAsMember.body.data.id;

    const updateAsViewer = await request(app)
      .patch(`/api/v1/projects/${projId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${members.viewer}`)
      .send({ title: 'tampered' });
    expect(updateAsViewer.status).toBe(403);

    const updateAsMember = await request(app)
      .patch(`/api/v1/projects/${projId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ title: 'edited' });
    expect(updateAsMember.status).toBe(200);

    const deleteAsViewer = await request(app)
      .delete(`/api/v1/projects/${projId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${members.viewer}`);
    expect(deleteAsViewer.status).toBe(403);

    const deleteAsMember = await request(app)
      .delete(`/api/v1/projects/${projId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${members.member}`);
    expect(deleteAsMember.status).toBe(200);
  });

  it('viewer cannot post comments; member can edit their own comment', async () => {
    const { projId, members, columnId } = await makeProjectWithRoles();
    const taskId = await createTask(members.member, projId, columnId);

    const viewerComment = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${members.viewer}`)
      .send({ content: 'intrusion' });
    expect(viewerComment.status).toBe(403);

    const memberComment = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ content: 'legit' });
    expect(memberComment.status).toBe(201);
    const commentId = memberComment.body.data.id;

    const editOwn = await request(app)
      .patch(`/api/v1/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ content: 'updated' });
    expect(editOwn.status).toBe(200);

    const editOthers = await request(app)
      .patch(`/api/v1/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${members.admin}`)
      .send({ content: 'hijacked' });
    expect([403, 404]).toContain(editOthers.status);
  });

  it('role changes are ADMIN+ only, and non-admin cannot invite members', async () => {
    const { owner, projId, members } = await makeProjectWithRoles();
    const victim = await registerUser('RBAC Victim');

    // Victim becomes a MEMBER of the project first.
    const invite = await addMember(owner.token, projId, 'MEMBER', victim.email);
    expect(invite.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${members.member}`);
    expect(listRes.status).toBe(200);
    const victimId = listRes.body.data.find((m) => m.user.name === 'RBAC Victim')?.id;
    expect(victimId).toBeTruthy();

    const asMember = await request(app)
      .patch(`/api/v1/projects/${projId}/members/${victimId}`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ role: 'ADMIN' });
    expect(asMember.status).toBe(403);

    const asAdmin = await request(app)
      .patch(`/api/v1/projects/${projId}/members/${victimId}`)
      .set('Authorization', `Bearer ${members.admin}`)
      .send({ role: 'ADMIN' });
    expect(asAdmin.status).toBe(200);

    const inviteAsMember = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${members.member}`)
      .send({ email: victim.email, role: 'MEMBER' });
    expect(inviteAsMember.status).toBe(403);
  });

  it('a member cannot reorder a board from a different project', async () => {
    const ownerA = await registerUser('RBAC Reorder A');
    const projA = await createProject(ownerA.token, 'Reorder A');
    const boardA = await getBoard(ownerA.token, projA);

    const ownerB = await registerUser('RBAC Reorder B');
    const projB = await createProject(ownerB.token, 'Reorder B');
    const boardB = await getBoard(ownerB.token, projB);

    // Attacker is a member of projA only; targets projB's board.
    const attackerUser = await registerUser('RBAC Reorder Attacker');
    const invited = await addMember(ownerA.token, projA, 'MEMBER', attackerUser.email);
    expect(invited.status).toBe(201);
    const attackerLogin = await loginUser(attackerUser.email, attackerUser.password);
    const attackerToken = attackerLogin.body.data.accessToken;

    // Create a second column on projB's board.
    await request(app)
      .post(`/api/v1/projects/${projB}/boards/${boardB.id}/columns`)
      .set('Authorization', `Bearer ${ownerB.token}`)
      .send({ title: 'Second' });
    const freshBoardB = await getBoard(ownerB.token, projB);
    const idsB = freshBoardB.columns.map((c) => c.id);
    const originalOrder = [...idsB];

    const attack = await request(app)
      .patch(`/api/v1/projects/${projA}/boards/${boardB.id}/columns/reorder`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ orderedIds: idsB.reverse() });
    expect(attack.status).toBe(404); // board is not part of projA

    const still = await getBoard(ownerB.token, projB);
    expect(still.columns.map((c) => c.id)).toEqual(originalOrder);
  });

  it('non-member cannot access the project at all (403)', async () => {
    const { projId } = await makeProjectWithRoles();
    const outsider = await registerUser('RBAC Outsider');
    const res = await request(app)
      .get(`/api/v1/projects/${projId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(403);
  });
});