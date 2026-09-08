require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

// In production, mandatory secrets must be provided; never fall back to the
// dev defaults that are committed to the repository. Failing fast here prevents
// a misconfigured deployment from silently running with predictable secrets.
function mandatorySecret(key, fallback) {
  const value = process.env[key];
  if (!value || (fallback && value === fallback)) {
    if (nodeEnv === 'production') {
      throw new Error(`${key} must be set in production`);
    }
  }
  return value || fallback;
}

const accessSecret = mandatorySecret('JWT_ACCESS_SECRET', 'dev-access-secret-change-me');
const refreshSecret = mandatorySecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');

module.exports = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  clientUrl: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwt: {
    accessSecret,
    refreshSecret,
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  },

cookie: {
    secure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production',
    sameSite: process.env.COOKIE_SAMESITE || (nodeEnv === 'production' ? 'none' : 'lax'),
  },

  appUrl: process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'ProjectFlow <no-reply@projectflow.local>',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localDir: process.env.STORAGE_LOCAL_DIR || './uploads',
    maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES || String(10 * 1024 * 1024), 10),
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    bucket: process.env.STORAGE_BUCKET,
  },

  // Maintained for route use even if the refresh secret is referenced there.
  allowedOrigins: (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
