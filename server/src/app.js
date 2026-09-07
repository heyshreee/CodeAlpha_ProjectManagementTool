const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const logger = require('./lib/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const projectsRoutes = require('./routes/projects.routes');
const boardsRoutes = require('./routes/boards.routes');
const tasksRoutes = require('./routes/tasks.routes');
const tasksItemRoutes = require('./routes/tasks.item.routes');
const commentsRoutes = require('./routes/comments.routes');
const attachmentsRoutes = require('./routes/attachments.routes');
const { itemRouter: attachmentItemRoutes } = require('./routes/attachments.routes');
const labelsRoutes = require('./routes/labels.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

// Trust proxy so req.ip and rate limiting work behind a reverse proxy.
app.set('trust proxy', 1);

// Security headers.
app.use(helmet());

// Structured request logging with request ids.
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  })
);

// CORS with credentials (for httpOnly cookie refresh).
const allowedOrigins = env.allowedOrigins;
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health endpoint (unauthenticated).
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: 'connected', version: '1.0.0', uptime: process.uptime() });
});

// Serve only image files (avatars) from the uploads dir in dev. Attachments are
// served exclusively through the authorized download endpoint. Serving raw
// user-uploaded content statically could otherwise allow active content (HTML,
// SVG, scripts) to be delivered to browsers. No-sniff is forced so a browser
// never interprets a file as anything other than what we declare.
if (env.nodeEnv !== 'production') {
  app.use('/uploads', (req, res, next) => {
    const safe = path.basename(req.path);
    const filePath = path.join(env.storage.localDir, safe);
    const absolute = path.resolve(filePath);
    if (!absolute.startsWith(path.resolve(env.storage.localDir))) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    const ext = path.extname(safe).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    if (!imageExts.includes(ext)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return express.static(env.storage.localDir)(req, res, next);
  });
}

// API versioning.
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/users', usersRoutes);
api.use('/projects', projectsRoutes);
api.use('/projects/:projectId/boards', boardsRoutes);
api.use('/projects/:projectId/tasks', tasksRoutes);
api.use('/tasks', tasksItemRoutes);
api.use('/projects/:projectId/labels', labelsRoutes);
api.use('/tasks/:taskId/comments', commentsRoutes);
api.use('/tasks/:taskId/attachments', attachmentsRoutes);
api.use('/attachments', attachmentItemRoutes);
api.use('/notifications', notificationsRoutes);
api.use('/analytics', analyticsRoutes);

app.use('/api/v1', api);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
