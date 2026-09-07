const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const prisma = require('../lib/prisma');

function signAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

function signRefreshToken(userId) {
  // JWT carries the id; a separate random hash is stored server-side for rotation.
  return jwt.sign({ userId, type: 'refresh', jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] });
  if (typeof payload !== 'object' || payload.type !== 'access' || typeof payload.userId !== 'string') {
    throw new Error('Invalid access token');
  }
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] });
  if (typeof payload !== 'object' || payload.type !== 'refresh' || typeof payload.userId !== 'string') {
    throw new Error('Invalid refresh token');
  }
  return payload;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Rotating refresh-token storage.
// Returns the new token string; the hash is persisted. Old token is revoked.
async function createRefreshToken(userId) {
  const token = signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(token), expiresAt },
  });
  return token;
}

// Revoke every active refresh token belonging to the user (the whole family).
// Called when a reused refresh token is detected (possible theft) or on logout.
async function revokeAllRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Reuse-detection error type. Lets the caller distinguish "bad/expired token"
// from "this token was already used" (which implies possible theft).
class ReusedTokenError extends Error {
  constructor() {
    super('Refresh token reuse detected');
    this.reuse = true;
  }
}

async function refreshTokenFor(token, userId) {
  const hash = sha256(token);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!record) {
    throw new Error('Refresh token is not valid');
  }
  if (record.revokedAt) {
    // A revoked token is being presented again. This is the signature of a
    // replay attempt: a stolen token that was already rotated. Treat it as
    // possible theft and revoke the entire session family.
    throw new ReusedTokenError();
  }
  if (record.expiresAt < new Date()) {
    throw new Error('Refresh token has expired');
  }
  if (record.userId !== userId) {
    throw new Error('Refresh token user mismatch');
  }
  // Rotate: revoke current, issue a new one.
  const newToken = signRefreshToken(userId);
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: sha256(newToken) },
    }),
    prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(newToken), expiresAt: record.expiresAt },
    }),
  ]);
  return newToken;
}

async function revokeRefreshToken(token) {
  const hash = sha256(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createRefreshToken,
  refreshTokenFor,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  ReusedTokenError,
  sha256,
};
