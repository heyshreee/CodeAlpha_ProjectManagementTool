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

async function addMember(ownerToken, projectId, role, targetEmail) {
  return request(app)
    .post(`/api/v1/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: targetEmail, role });
}

describe('IDOR / BOLA protection', () => {
  it('user cannot read a task from a project they do not belong to', async () => {
    const owner = await registerUser('IDOR Owner');
    const projId = await createProject(owner.token, 'IDOR Project');
    const board = await getBoard(owner.token, projId);
    const taskId = await createTask(owner.token, projId, board.columns[0].id);

    const attacker = await registerUser('IDOR Attacker');
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(res.status).toBe(403);
  });

  it('user cannot move a task in another project', async () => {
    const owner = await registerUser('IDOR2 Owner');
    const projId = await createProject(owner.token, 'IDOR2 Project');
    const board = await getBoard(owner.token, projId);
    const taskId = await createTask(owner.token, projId, board.columns[0].id);

    const attacker = await registerUser('IDOR2 Attacker');
    const res = await request(app)
      .patch(`/api/v1/projects/${projId}/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ columnId: board.columns[1].id });
    expect(res.status).toBe(403);
  });

  it('user cannot comment on a task from another project', async () => {
    const owner = await registerUser('IDOR3 Owner');
    const projId = await createProject(owner.token, 'IDOR3 Project');
    const board = await getBoard(owner.token, projId);
    const taskId = await createTask(owner.token, projId, board.columns[0].id);

    const attacker = await registerUser('IDOR3 Attacker');
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ content: 'intrusion' });
    expect(res.status).toBe(403);
  });

  it('task does not exist returns 404, not 403', async () => {
    const user = await registerUser('IDOR4');
    const res = await request(app)
      .get('/api/v1/tasks/nonexistent-task-id')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });

  it('member limited to roles still cannot promote themselves to admin', async () => {
    const owner = await registerUser('BOLA Owner');
    const projId = await createProject(owner.token, 'BOLA Project');

    const member = await registerUser('BOLA Member');
    await addMember(owner.token, projId, 'MEMBER', member.email);
    const memberLogin = await loginUser(member.email, member.password);
    const memberToken = memberLogin.body.data.accessToken;

    // Try to invite themselves as ADMIN (requires ADMIN role => 403).
    const res = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: member.email, role: 'ADMIN' });
    expect(res.status).toBe(403);
  });
});
