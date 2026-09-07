import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app, registerUser, createProject, getBoard, createTask, addMember, loginUser,
} from './helpers.js';

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function projectWithTaskAndMember() {
  const owner = await registerUser('Upload Owner');
  const projId = await createProject(owner.token, 'Upload Project');
  const board = await getBoard(owner.token, projId);
  const taskId = await createTask(owner.token, projId, board.columns[0].id, 'Has Files');

  const other = await registerUser('Upload Member');
  const invited = await addMember(owner.token, projId, 'MEMBER', other.email);
  expect(invited.status).toBe(201);
  const otherLogin = await loginUser(other.email, other.password);
  const otherToken = otherLogin.body.data.accessToken;

  return { owner, projId, taskId, otherToken };
}

describe('Upload security (real assertions)', () => {
  it('accepts a valid PNG and stores it safely', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', PNG, { filename: 'pic.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    expect(up.body.data.storageKey).not.toMatch(/\.png$/);
    expect(up.body.data.originalName).toBe('pic.png');
  });

  it('rejects executable/scripting extensions even with a safe MIME', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    for (const name of ['shell.html', 'x.php', 'img.svg', 'evil.jsp', 't.sh', 's.bat', 'o.js']) {
      const up = await request(app)
        .post(`/api/v1/tasks/${taskId}/attachments`)
        .set('Authorization', `Bearer ${owner.token}`)
        .attach('file', Buffer.from('<script>alert(1)</script>', 'utf8'), { filename: name, contentType: 'text/plain' });
      expect(up.status).toBe(400);
    }
  });

  it('rejects dangerous MIME types regardless of extension', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', Buffer.from('<svg onload=alert(1)>', 'utf8'), { filename: 'ok.txt', contentType: 'image/svg+xml' });
    expect(up.status).toBe(400);
  });

  it('rejects non-text content whose magic bytes cannot be verified', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', Buffer.from('00011000ff not really a known type 1111', 'utf8'), { filename: 'data.bin', contentType: 'application/octet-stream' });
    expect(up.status).toBe(400);
  });

  it('rejects a renamed executable (magic bytes mismatch)', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    // MZ header (Windows executable) but typed as a PNG — content check rejects.
    const mz = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(20)]);
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', mz, { filename: 'innocent.png', contentType: 'image/png' });
    expect(up.status).toBe(400);
  });

  it('sanitizes path traversal filenames and never reflects them on disk', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', Buffer.from('hello world', 'utf8'), { filename: '../../../../etc/evil.txt', contentType: 'text/plain' });
    expect(up.status).toBe(201);
    expect(up.body.data.originalName).toBe('evil.txt');
    expect(up.body.data.storageKey).not.toMatch(/(\.\.|\/|\\)/);
  });

  it('rejects files larger than the configured limit', async () => {
    const { owner, taskId } = await projectWithTaskAndMember();
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', big, { filename: 'big.txt', contentType: 'text/plain' });
    expect(up.status).toBe(413);
  });

  it('members can download files, outsiders cannot', async () => {
    const { owner, taskId, otherToken } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', PNG, { filename: 'dl.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const attachmentId = up.body.data.id;

    const outsider = await registerUser('Upload Outsider');
    const blocked = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(blocked.status).toBe(403);

    const ok = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(ok.status).toBe(200);
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['cache-control']).toContain('no-store');
  });

  it('only the uploader (or an admin) may delete an attachment', async () => {
    const { owner, taskId, otherToken } = await projectWithTaskAndMember();
    const up = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', PNG, { filename: 'del.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const id = up.body.data.id;

    const asOther = await request(app)
      .delete(`/api/v1/attachments/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(asOther.status).toBe(403);

    const asOwner = await request(app)
      .delete(`/api/v1/attachments/${id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(asOwner.status).toBe(200);
  });
});