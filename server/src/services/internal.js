const prisma = require('../lib/prisma');
const { emitToUser, emitToProject } = require('../lib/realtime');
const logger = require('../lib/logger');

// Create a notification for a user and push it in real time.
async function notifyUser({ userId, projectId = null, taskId = null, type, title, body = null }) {
  if (!userId) return null;
  try {
    const notification = await prisma.notification.create({
      data: { userId, projectId, taskId, type, title, body },
    });
    emitToUser(userId, 'notification.created', notification);
    return notification;
  } catch (error) {
    // Notification failures should not break the primary operation.
    logger.warn({ err: error }, 'Failed to create notification');
    return null;
  }
}

// Record an activity entry for a project and stream it.
async function recordActivity({ projectId, userId, action, details = null, taskId = null }) {
  try {
    const activity = await prisma.activity.create({
      data: { projectId, userId, action, details, taskId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    emitToProject(projectId, 'activity.created', activity);
    return activity;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to record activity');
    return null;
  }
}

module.exports = { notifyUser, recordActivity };
