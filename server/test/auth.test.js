import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerUser, loginUser } from './helpers.js';

describe('Authentication', () => {
  it('registers a new user and returns tokens', async () => {
    const { email, token } = await registerUser('Auth Test');
    expect(token).toBeTruthy();
    expect(email).toBeTruthy();
  });

  it('rejects duplicate registrations', async () => {
    const { email } = await registerUser('Dup');
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup2', email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects short passwords at validation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bad', email: `bad${Date.now()}@x.com`, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials', async () => {
    const { email, password } = await registerUser('Login');
    const res = await loginUser(email, password);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const { email } = await registerUser('WrongPass');
    const res = await loginUser(email, 'wrongpassword');
    expect(res.status).toBe(401);
  });

  it('rejects unknown account', async () => {
    const res = await loginUser('ghost@example.com', 'password123');
    expect(res.status).toBe(401);
  });

  it('requires auth on protected routes', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('rejects expired/invalid tokens', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });
});
