const prisma = require('../lib/prisma');
const { verifyAccessToken } = require('../utils/tokens');
const AppError = require('../lib/AppError');

// The public shape of a user, safe to expose.
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    accentColor: user.accentColor || null,
    createdAt: user.createdAt,
  };
}

// Authentication: reads access token from Authorization header.
async function authenticate(req, _res, next) {
  const authorization = req.headers.authorization;
  const token = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return next(new AppError(401, 'Account no longer exists'));
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(new AppError(401, 'Invalid or expired authentication token'));
  }
}

module.exports = { authenticate, publicUser };
