import { expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

export { app, prisma, expect };

let counter = 0;
const rand = () => Math.random().toString(36).slice(2, 8);

export async function registerUser(name) {
  counter += 1;
  const email = `user${Date.now()}_${counter}_${rand()}@example.com`.toLowerCase();
  const password = 'password123';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: name || `User ${counter}`, email, password });
  expect(res.status).toBe(201);
  return { email, password, token: res.body.data.accessToken, user: res.body.data.user };
}

export async function loginUser(email, password) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res;
}

export async function createProject(token, name = 'Test Project') {
  const res = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, description: 'test' });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

export async function getBoard(token, projectId) {
  const res = await request(app)
    .get(`/api/v1/projects/${projectId}/boards`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  const board = res.body.data[0];
  return board;
}

export async function createTask(token, projectId, columnId, title = 'Task') {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title, columnId });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

export async function addMember(ownerToken, projectId, role, targetEmail) {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: targetEmail, role });
  return res;
}