import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app, registerUser, createProject, getBoard, createTask,
} from './helpers.js';

describe('Input validation', () => {
  it('register requires a valid email and 8+ char password', async () => {
    const badEmail = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bad', email: 'not-an-email', password: 'password123' });
    expect(badEmail.status).toBe(400);

    const shortPw = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bad', email: 'ok@example.com', password: 'short' });
    expect(shortPw.status).toBe(400);

    const missingName = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'ok@example.com', password: 'password123' });
    expect(missingName.status).toBe(400);
  });

  it('rejects empty/oversized task titles', async () => {
    const user = await registerUser('Val Task');
    const projId = await createProject(user.token);
    const board = await getBoard(user.token, projId);
    const columnId = board.columns[0].id;

    const empty = await request(app)
      .post(`/api/v1/projects/${projId}/tasks`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: '   ', columnId });
    expect(empty.status).toBe(400);

    const huge = await request(app)
      .post(`/api/v1/projects/${projId}/tasks`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'x'.repeat(201), columnId });
    expect(huge.status).toBe(400);
  });

  it('rejects empty comments', async () => {
    const user = await registerUser('Val Comment');
    const projId = await createProject(user.token);
    const board = await getBoard(user.token, projId);
    const taskId = await createTask(user.token, projId, board.columns[0].id);

    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ content: '  ' });
    expect(res.status).toBe(400);
  });

  it('project name cannot be empty or longer than 100 chars', async () => {
    const user = await registerUser('Val Project');
    const empty = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: '' });
    expect(empty.status).toBe(400);

    const huge = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'x'.repeat(200) });
    expect(huge.status).toBe(400);
  });

  it('invalid member roles are rejected', async () => {
    const owner = await registerUser('Val Role');
    const projId = await createProject(owner.token);
    const target = await registerUser('Val Role Target');

    const res = await request(app)
      .post(`/api/v1/projects/${projId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: target.email, role: 'SUPERUSER' });
    expect(res.status).toBe(400);
  });

  it('search caps overlong queries silently rather than crashing', async () => {
    const user = await registerUser('Val Search');
    const res = await request(app)
      .get(`/api/v1/analytics/search?q=${'a'.repeat(200)}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toEqual([]);
  });

  it('invalid task ids are 404; valid task move succeeds', async () => {
    const user = await registerUser('Val Move');
    const projId = await createProject(user.token);
    const board = await getBoard(user.token, projId);
    const taskId = await createTask(user.token, projId, board.columns[0].id);
    const columnId = board.columns[0].id;

    const badTarget = await request(app)
      .patch(`/api/v1/projects/${projId}/tasks/not-a-real-id`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'x' });
    expect(badTarget.status).toBe(404);

    const goodMove = await request(app)
      .patch(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ columnId });
    expect(goodMove.status).toBe(200);
  });

  it('duplicate label ids on a task are deduplicated, not doubled', async () => {
    const user = await registerUser('Val DupLabel');
    const projId = await createProject(user.token);
    const board = await getBoard(user.token, projId);
    const taskId = await createTask(user.token, projId, board.columns[0].id, 'Labelled');

    const label = await request(app)
      .post(`/api/v1/projects/${projId}/labels`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Bug' });
    expect(label.status).toBe(201);
    const labelId = label.body.data.id;

    const dup = await request(app)
      .patch(`/api/v1/projects/${projId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ labelIds: [labelId, labelId] });
    expect(dup.status).toBe(200);

    const task = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(task.body.data.labels).toHaveLength(1);
  });

  it('label duplicate creation and rename collisions return 409', async () => {
    const user = await registerUser('Val DupLabel2');
    const projId = await createProject(user.token);

    const a = await request(app)
      .post(`/api/v1/projects/${projId}/labels`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Docs' });
    expect(a.status).toBe(201);

    const b = await request(app)
      .post(`/api/v1/projects/${projId}/labels`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Docs' });
    expect(b.status).toBe(409);

    const c = await request(app)
      .post(`/api/v1/projects/${projId}/labels`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Press' });
    expect(c.status).toBe(201);

    const rename = await request(app)
      .patch(`/api/v1/projects/${projId}/labels/${c.body.data.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Docs' });
    expect(rename.status).toBe(409);
  });
});