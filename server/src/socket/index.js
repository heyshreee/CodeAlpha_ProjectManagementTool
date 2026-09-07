const { Server } = require('socket.io');
const { verifyRefreshToken, verifyAccessToken } = require('../utils/tokens');
const prisma = require('../lib/prisma');
const { setIo } = require('../lib/realtime');
const logger = require('../lib/logger');

// The socket server never trusts the client for room membership or identity.
// Users are placed into their personal room and into project rooms based ONLY
// on database membership, resolved server-side at connection time. Clients can
// request membership in a project room through `project:join`, but every such
// request is re-validated against the database before the join is honoured.

async function loadAuthorizedProjectIds(userId) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return new Set(memberships.map((m) => m.projectId));
}

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim()),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      let userId = null;

      if (token) {
        const payload = verifyAccessToken(token);
        if (payload) userId = payload.userId;
      }
      if (!userId) {
        const cookie = socket.handshake.headers?.cookie || '';
        const match = cookie.match(/pf_refresh=([^;]+)/);
        if (match) {
          const refreshPayload = verifyRefreshToken(decodeURIComponent(match[1]));
          if (refreshPayload) userId = refreshPayload.userId;
        }
      }
      if (!userId) return next(new Error('unauthorized'));
      // Verify the user still exists in the DB.
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) return next(new Error('unauthorized'));
      socket.userId = userId;
      return next();
    } catch (error) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    // Join each project room the user is a member of (server-authoritative).
    try {
      const authorized = await loadAuthorizedProjectIds(userId);
      socket.data.authorizedProjects = authorized;
      for (const projectId of authorized) socket.join(`project:${projectId}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load rooms for socket');
      socket.data.authorizedProjects = new Set();
    }

    // Explicit re-validation for dynamic joins: the client can only ever join a
    // room it is an actual member of. Unknown/unauthorized projects are
    // silently refused (not joined).
    socket.on('project:join', async (projectId) => {
      if (typeof projectId !== 'string' || !projectId) return;
      if (!socket.data.authorizedProjects) {
        try {
          socket.data.authorizedProjects = await loadAuthorizedProjectIds(userId);
        } catch {
          return;
        }
      }
      if (socket.data.authorizedProjects.has(projectId)) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('project:leave', (projectId) => {
      if (typeof projectId === 'string') socket.leave(`project:${projectId}`);
    });

    // Re-resolve memberships after membership changes (e.g. added to a project
    // while connected).
    socket.on('projects:resync', async () => {
      try {
        socket.data.authorizedProjects = await loadAuthorizedProjectIds(userId);
        for (const projectId of socket.data.authorizedProjects) {
          socket.join(`project:${projectId}`);
        }
      } catch {
        /* transient */
      }
    });
  });

  setIo(io);
  return io;
}

module.exports = { createSocketServer };
