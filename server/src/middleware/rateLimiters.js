const rateLimit = require('express-rate-limit');
const AppError = require('../lib/AppError');

const handler = (req, res, next, options) =>
  next(new AppError(options.statusCode || 429, 'Too many requests, please try again later'));

// Tests exercise many sequential requests from one IP; keep the HTTP limiter as
// a no-op there so the application-level lockout logic is what's being asserted.
const testMode = process.env.RATE_LIMIT_DISABLED === 'true';
const limit = (n) => (testMode ? 10_000_000 : n);

// Tight limit for auth endpoints to blunt brute force & credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limit(20),
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Refresh endpoint: rotating refresh tokens must not be sprayable.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limit(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// General API limiter.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: limit(120),
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Search can be expensive; keep it bounded.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: limit(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Uploads consume bandwidth/disk; keep them bounded.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limit(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { authLimiter, apiLimiter, refreshLimiter, searchLimiter, uploadLimiter };
