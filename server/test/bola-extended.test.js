import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app, registerUser, loginUser, createProject, getBoard, createTask, addMember,
} from './helpers.js';

// Full BOLA/IDOR matrix: User A must never reach User B's resources. Attacks are
// attempted against projects, tasks, comments, attachments, boards, members,
// notifications, activities, and analytics.

async function setupTwoProjectsWithTask() {
  const ownerA = await registerUser('BOLA Owner A');
  const projA = await createProject(ownerA.token, 'PROJ-A');
  const boardA = await getBoard(ownerA.token, projA);
  const taskA = await createTask(ownerA.token, projA, boardA.columns[0].id, 'Task A');

  const ownerB = await registerUser('BOLA Owner B');
  const projB = await createProject(ownerB.token, 'PROJ-B');
  const boardB = await getBoard(ownerB.token, projB);
  const taskB = await createTask(ownerB.token, projB, boardB.columns[0].id, 'Task B');

  return { ownerA, projA, boardA, taskA, ownerB, projB, boardB, taskB };
}

describe('BOLA / IDOR protection matrix', () => {
  it('rejects reading another user project', async () => {
    const { ownerB, projB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Read Project');
    const res = await request(app)
      .get(`/api/v1/projects/${projB}`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(res.status).toBe(403);
  });

  it('rejects reading/updating/deleting another user task', async () => {
    const { taskB, projB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Task Ops');

    const read = await request(app)
      .get(`/api/v1/tasks/${taskB}`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(read.status).toBe(403);

    const update = await request(app)
      .patch(`/api/v1/projects/${projB}/tasks/${taskB}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ title: 'tampered' });
    expect(update.status).toBe(403);

    const del = await request(app)
      .delete(`/api/v1/projects/${projB}/tasks/${taskB}`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(del.status).toBe(403);
  });

  it('rejects moving a task into a column of a foreign board', async () => {
    const { taskA, projA, ownerA } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Move');
    const foreignColumn = (await getBoard(ownerA.token, projA)).columns[0]?.id;
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskA}/move`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ columnId: foreignColumn });
    expect(res.status).toBe(403);
  });

  it('rejects commenting on a foreign task', async () => {
    const { taskB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Comment');
    const res = await request(app)
      .post(`/api/v1/tasks/${taskB}/comments`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ content: 'intrusion' });
    expect(res.status).toBe(403);
  });

  it('rejects a task from another project being used to reach comments', async () => {
    const { taskA } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Comment Cross');
    const res = await request(app)
      .get(`/api/v1/tasks/${taskA}/comments`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(res.status).toBe(403);
  });

  it('rejects listing/uploading/downloading attachments on a foreign task', async () => {
    const { taskB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Attachment');

    const list = await request(app)
      .get(`/api/v1/tasks/${taskB}/attachments`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(list.status).toBe(403);

    const upload = await request(app)
      .post(`/api/v1/tasks/${taskB}/attachments`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .attach('file', Buffer.from('hello world', 'utf8'), 'note.txt');
    expect(upload.status).toBe(403);
  });

  it('rejects reading the foreign project board', async () => {
    const { ownerB, projB, boardB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Board');
    const viaList = await request(app)
      .get(`/api/v1/projects/${projB}/boards`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(viaList.status).toBe(403);

    const viaBoard = await request(app)
      .get(`/api/v1/projects/${projB}/boards/${boardB.id}`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(viaBoard.status).toBe(403);
  });

  it('rejects managing members of a foreign project', async () => {
    const { ownerB, projB, ownerA } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Members');
    const invite = await request(app)
      .post(`/api/v1/projects/${projB}/members`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ email: ownerA.email, role: 'MEMBER' });
    expect(invite.status).toBe(403);
    const list = await request(app)
      .get(`/api/v1/projects/${projB}/members`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(list.status).toBe(403);
  });

  it('rejects reading analytics and activity of a foreign project', async () => {
    const { projB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Analytics');
    const analytics = await request(app)
      .get(`/api/v1/projects/${projB}/analytics`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(analytics.status).toBe(403);
    const activity = await request(app)
      .get(`/api/v1/projects/${projB}/activities`)
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(activity.status).toBe(403);
  });

  it('rejects reading/updating another user notifications', async () => {
    const attacker = await registerUser('BOLA Notifications');
    const victim = await registerUser('BOLA Notif Victim');

    // Victim gets a notification (via project invitation).
    const owner = await registerUser('BOLA Notif Owner');
    const proj = await createProject(owner.token, 'Notif Project');
    await addMember(owner.token, proj, 'MEMBER', victim.email);

    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${victim.token}`);
    expect(notifRes.status).toBe(200);
    const victimNotifId = notifRes.body.data.notifications[0]?.id;

    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${attacker.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.notifications.some((n) => n.id === victimNotifId)).toBe(false);

    if (victimNotifId) {
      const mark = await request(app)
        .patch(`/api/v1/notifications/${victimNotifId}/read`)
        .set('Authorization', `Bearer ${attacker.token}`);
      // Either 403, or 404 without touching the victim's record.
      expect([403, 404]).toContain(mark.status);
      const after = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${victim.token}`);
      const still = after.body.data.notifications.find((n) => n.id === victimNotifId);
      expect(still?.status).toBe('UNREAD');
    }
  });

  it('rejects updating a column from a foreign project', async () => {
    const { ownerA, projA, boardA } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Column');
    const colA = boardA.columns[0].id;
    const patch = await request(app)
      .patch(`/api/v1/projects/${projA}/boards/${boardA.id}/columns/${colA}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ title: 'tampered' });
    expect(patch.status).toBe(403);
  });

  it('rejects creating a task in a foreign project (viewer of none)', async () => {
    const { projB, boardB } = await setupTwoProjectsWithTask();
    const attacker = await registerUser('BOLA Create Task');
    const res = await request(app)
      .post(`/api/v1/projects/${projB}/tasks`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ title: 'intrusion', columnId: boardB.columns[0].id });
    expect(res.status).toBe(403);
  });

  it('non-existent resources return 404 not 403', async () => {
    const user = await registerUser('BOLA 404');
    const byId = await request(app)
      .get('/api/v1/tasks/does-not-exist')
      .set('Authorization', `Bearer ${user.token}`);
    expect(byId.status).toBe(404);
    const byProject = await request(app)
      .get('/api/v1/projects/does-not-exist')
      .set('Authorization', `Bearer ${user.token}`);
    expect(byProject.status).toBe(404);
  });
});