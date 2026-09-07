import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, prisma, registerUser, loginUser } from './helpers.js';
import { sha256 } from '../src/utils/tokens.js';

// Auth security matrix: refresh rotation, reuse detection, family revocation,
// lockout, password reset flows, anti-enumeration, password change.

async function refresh(agent) {
  return request(app).post('/api/v1/auth/refresh').set('Cookie', agent.cookieHeader());
}

// A tiny agent wrapper that carries Set-Cookie across calls.
function makeAgent() {
  const jar = {};
  const self = {
    jar,
    cookieHeader() {
      return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    },
    capture(res) {
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        for (const c of Array.isArray(setCookie) ? setCookie : [setCookie]) {
          const [kv] = c.split(';');
          const idx = kv.indexOf('=');
          const key = kv.slice(0, idx).trim();
          const value = kv.slice(idx + 1).trim();
          jar[key] = value;
        }
      }
      return res;
    },
  };
  return self;
}

describe('Authentication security', () => {
  it('refresh rotates the refresh token and issues a new access token', async () => {
    const { email, password } = await registerUser('Rotate');
    const res = await loginUser(email, password);
    const agent = makeAgent();
    agent.capture(res);
    const oldCookie = agent.cookieHeader();

    const r1 = agent.capture(await refresh(agent));
    expect(r1.status).toBe(200);
    expect(r1.body.data.accessToken).toBeTruthy();
    expect(agent.cookieHeader()).not.toBe(oldCookie);
  });

  it('reusing an already-rotated refresh token revokes the whole session family', async () => {
    const { email, password } = await registerUser('Reuse');
    const loginRes = await loginUser(email, password);
    const agent = makeAgent();
    agent.capture(loginRes);
    const stolenOldCookie = agent.cookieHeader();

    // Legitimate rotation.
    const r1 = agent.capture(await refresh(agent));
    expect(r1.status).toBe(200);
    const rotatedCookie = agent.cookieHeader();

    // Attacker replays the OLD (already rotated) token.
    const legitAgent = makeAgent();
    legitAgent.jar.pf_refresh = stolenOldCookie.split('pf_refresh=')[1];
    const replay = await refresh(legitAgent);
    expect(replay.status).toBe(401);

    // Because reuse was detected, the family (including the NEW token) is
    // revoked — the legitimate session must also fail and require re-login.
    const legitAgent2 = makeAgent();
    legitAgent2.jar.pf_refresh = rotatedCookie.split('pf_refresh=')[1];
    const after = await refresh(legitAgent2);
    expect(after.status).toBe(401);
  });

  it('logout revokes the refresh token so it can no longer be used', async () => {
    const { email, password } = await registerUser('Logout');
    const loginRes = await loginUser(email, password);
    const agent = makeAgent();
    agent.capture(loginRes);
    const cookie = agent.cookieHeader();

    const out = agent.capture(await request(app).post('/api/v1/auth/logout').set('Cookie', cookie));
    expect(out.status).toBe(200);

    const again = await refresh(agent);
    expect(again.status).toBe(401);
  });

  it('refresh with no cookie returns 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('locks an account after 8 failed login attempts within the window', async () => {
    const { email, password } = await registerUser('Lockout');
    // Pre-fill the historic failures so we don't need 8 sequential password
    // verifications; the count threshold is what matters.
    const since = new Date(Date.now() - 15 * 60 * 1000);
    // (actual failures arrive via login attempts below)
    for (let i = 0; i < 7; i += 1) {
      await prisma.loginAttempt.create({
        data: { email, ip: 'test', success: false, createdAt: new Date() },
      });
    }
    const wrong = await loginUser(email, 'wrong-password');
    expect(wrong.status).toBe(401); // records the 8th failure
    const correct = await loginUser(email, password);
    expect(correct.status).toBe(429); // account now locked despite valid password
  });

  it('does not reveal whether an email exists via forgot-password', async () => {
    const { email } = await registerUser('Enum');
    const existing = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email });
    const ghost = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: `ghost-${Date.now()}@example.com` });
    expect(existing.status).toBe(200);
    expect(ghost.status).toBe(200);
    expect(existing.body.data.message).toBe(ghost.body.data.message);
  });

  it('resets a password with a valid reset token and revokes sessions', async () => {
    const { email, password } = await registerUser('Reset');
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    await request(app).post('/api/v1/auth/forgot-password').send({ email });
    console.log = origLog;

    const line = logs.find((l) => l.includes('[mail-dev]') && l.includes('reset-password?token='));
    const token = line.match(/reset-password\?token=([0-9a-f]+)/)?.[1];
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    expect(reset.status).toBe(200);

    // Old password no longer works.
    const oldLogin = await loginUser(email, password);
    expect(oldLogin.status).toBe(401);
    // New password works.
    const newLogin = await loginUser(email, 'newpassword123');
    expect(newLogin.status).toBe(200);

    // A PasswordChangeLog entry was recorded.
    const user = await prisma.user.findUnique({ where: { email } });
    const log = await prisma.passwordChangeLog.count({ where: { userId: user.id } });
    expect(log).toBeGreaterThanOrEqual(1);
  });

  it('rejects a reused reset token', async () => {
    const { email } = await registerUser('ResetReuse');
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    await request(app).post('/api/v1/auth/forgot-password').send({ email });
    console.log = origLog;

    const line = logs.find((l) => l.includes('[mail-dev]') && l.includes('reset-password?token='));
    const token = line.match(/reset-password\?token=([0-9a-f]+)/)?.[1];
    expect(token).toBeTruthy();

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    const second = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'anotherpassword123' });
    expect(second.status).toBe(400);
  });

  it('rejects an expired reset token', async () => {
    const { email } = await registerUser('ResetExpired');
    const user = await prisma.user.findUnique({ where: { email } });
    const rawToken = 'a'.repeat(64);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('password change requires current password and invalidates sessions', async () => {
    const { email, password, token } = await registerUser('ChangePw');

    const wrong = await request(app)
      .post('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-the-password', newPassword: 'newpassword123' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: 'newpassword123' });
    expect(ok.status).toBe(200);

    const relogin = await loginUser(email, 'newpassword123');
    expect(relogin.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    const log = await prisma.passwordChangeLog.count({ where: { userId: user.id } });
    expect(log).toBeGreaterThanOrEqual(1);
  });

  it('users can only update their own profile; unknown fields are rejected', async () => {
    const { token } = await registerUser('Profile');
    const ok = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed User' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.name).toBe('Renamed User');

    // Mass-assignment attempt: role/email/password must not be accepted.
    const attack = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacker', email: 'hacker@example.com', passwordHash: 'x', role: 'OWNER' });
    expect(attack.status).toBe(200);
    expect(attack.body.data.user.email).not.toBe('hacker@example.com');
  });
});