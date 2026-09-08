const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const cloudinary = require('../lib/cloudinary');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  signAccessToken,
  createRefreshToken,
  refreshTokenFor,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  ReusedTokenError,
  sha256,
} = require('../utils/tokens');
const { publicUser } = require('../middleware/auth');
const { verifyMagicBytes } = require('../middleware/upload');
const { sendMail } = require('../lib/mailer');
const env = require('../config/env');

const REFRESH_COOKIE = 'pf_refresh';
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

async function recordLogin(email, ip, success) {
  try {
    await prisma.loginAttempt.create({ data: { email, ip, success } });
  } catch {
    /* non-critical */
  }
}

async function tooManyFailedLogins(email, windowMs = 15 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  return count >= 8;
}

const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return accessToken;
};

const withProjectCount = async (user) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const ids = memberships.map((m) => m.projectId);
  const projects = ids.length
    ? await prisma.project.count({ where: { id: { in: ids } } })
    : 0;
  return projects;
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) throw new AppError(409, 'An account with that email already exists');

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash: await hashPassword(password) },
  });

  const accessToken = await issueTokens(user, res);
  return res.status(201).json({
    success: true,
    data: { user: publicUser(user), accessToken, projects: 0 },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();
  const ip = req.ip;

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : false;

  if (!user || !valid) {
    await recordLogin(normalizedEmail, ip, false);
    // Uniform response to avoid account enumeration; account lockout is the
    // rate limiter + failed-login threshold enforced on refresh flow.
    throw new AppError(401, 'Invalid email or password');
  }
  if (await tooManyFailedLogins(normalizedEmail)) {
    await recordLogin(normalizedEmail, ip, false);
    throw new AppError(429, 'Too many failed attempts. Please try again later.');
  }

  await recordLogin(normalizedEmail, ip, true);
  // Reset failed-attempt state on success so successful users are never
  // inadvertently locked out by a stale failure window.
  try {
    await prisma.loginAttempt.deleteMany({ where: { email: normalizedEmail, success: false } });
  } catch {
    /* non-critical */
  }
  const accessToken = await issueTokens(user, res);
  const projects = await withProjectCount(user);
  return res.json({ success: true, data: { user: publicUser(user), accessToken, projects } });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies[REFRESH_COOKIE];
  if (!token) throw new AppError(401, 'No refresh token provided');

  let payload;
  try {
    payload = require('../utils/tokens').verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  let newRefreshToken;
  try {
    newRefreshToken = await refreshTokenFor(token, payload.userId);
  } catch (error) {
    // If the presented token was already used, revoke the whole session family
    // and force the user to log in again.
    if (error instanceof ReusedTokenError) {
      try {
        await revokeAllRefreshTokens(payload.userId);
        await prisma.loginAttempt.create({
          data: { email: 'unknown', ip: req.ip, success: false },
        });
      } catch {
        /* non-critical */
      }
      res.clearCookie(REFRESH_COOKIE, cookieOptions());
      throw new AppError(401, 'Session expired. Please log in again.');
    }
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(401, 'Account no longer exists');

  res.cookie(REFRESH_COOKIE, newRefreshToken, cookieOptions());
  const accessToken = signAccessToken(user.id);
  return res.json({ success: true, data: { user: publicUser(user), accessToken } });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      await revokeRefreshToken(token);
    } catch {
      /* ignore */
    }
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  return res.json({ success: true, data: { message: 'Logged out' } });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond identically to prevent account enumeration.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const resetUrl = `${env.appUrl}/reset-password?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your ProjectFlow password',
      text:
        `You requested a password reset for your ProjectFlow account.\n\n` +
        `Open this link within the next hour to choose a new password:\n${resetUrl}\n\n` +
        `If you did not request this, you can safely ignore this email.\n`,
    });
  }

  return res.json({
    success: true,
    data: { message: 'If that email exists, a reset link has been sent' },
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'Reset token is invalid or has expired');
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw new AppError(400, 'Reset token is invalid or has expired');

  const newHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.passwordChangeLog.create({ data: { userId: user.id } }),
  ]);

  return res.json({ success: true, data: { message: 'Password has been reset. Please log in.' } });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = user ? await verifyPassword(user.passwordHash, currentPassword) : false;
  if (!valid) throw new AppError(400, 'Current password is incorrect');

  const newHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.passwordChangeLog.create({ data: { userId: user.id } }),
  ]);

  return res.json({ success: true, data: { message: 'Password updated' } });
});

exports.me = asyncHandler(async (req, res) => {
  const projects = await withProjectCount(req.user);
  return res.json({ success: true, data: { user: publicUser(req.user), projects } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body,
  });
  return res.json({ success: true, data: { user: publicUser(user) } });
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file provided');

  // Verify the uploaded bytes really are an image before trusting the MIME type.
  let buffer;
  if (req.file.buffer) {
    buffer = req.file.buffer;
  } else {
    const fs = require('fs');
    buffer = fs.readFileSync(req.file.path);
  }
  const detected = await verifyMagicBytes(buffer);
  const allowedImages = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (detected === null || !allowedImages.includes(detected)) {
    throw new AppError(400, 'Uploaded file is not a valid image');
  }

  const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } });

  // `local`: keep the generated filename like today. `cloudinary`: stream from
  // memory and persist the full secure URL so avatars load straight from the CDN.
  let storedAvatar;
  if (env.storage.driver === 'cloudinary') {
    const IMAGE_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
    const ext = IMAGE_EXT[detected] || '.img';
    const publicId = `avatar-${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
    const result = await cloudinary.uploadBuffer(buffer, { publicId, resourceType: 'image' });
    storedAvatar = result.secure_url;

    // Best-effort cleanup of the previous avatar on Cloudinary.
    const oldId = cloudinary.publicIdFromUrl(current && current.avatar);
    if (oldId) {
      try {
        await cloudinary.destroy(oldId, 'image');
      } catch {
        /* ignore */
      }
    }
  } else {
    storedAvatar = req.file.filename;
  }

  await prisma.user.update({ where: { id: req.user.id }, data: { avatar: storedAvatar } });

  // Best-effort cleanup of previous avatar (local driver only).
  if (env.storage.driver === 'local' && current && current.avatar) {
    try {
      const fs = require('fs');
      const oldPath = `${env.storage.localDir}/${current.avatar}`;
      if (current.avatar !== storedAvatar && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {
      /* ignore */
    }
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  return res.json({
    success: true,
    data: { user: publicUser(user), filename: storedAvatar },
  });
});
