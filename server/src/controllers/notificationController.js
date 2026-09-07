const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const AppError = require('../lib/AppError');
const env = require('../config/env');
const { runDeadlineReminders } = require('../services/scheduler');

exports.list = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const where = {
    userId: req.user.id,
    ...(unreadOnly === 'true' ? { status: 'UNREAD' } : {}),
  };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { project: { select: { name: true, color: true } } },
    }),
    prisma.notification.count({ where: { userId: req.user.id, status: 'UNREAD' } }),
  ]);
  return res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
  await prisma.notification.update({
    where: { id: notification.id },
    data: { status: 'READ', readAt: new Date() },
  });
  return res.json({ success: true, data: { message: 'Marked read' } });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, status: 'UNREAD' },
    data: { status: 'READ', readAt: new Date() },
  });
  return res.json({ success: true, data: { message: 'All notifications marked read' } });
});

// Deadline reminders: dev/manual trigger only. Blocked in production so a
// connected client cannot force the server to fan out notifications.
exports.runDeadlineReminders = asyncHandler(async (_req, res) => {
  if (env.isProduction) throw new AppError(404, 'Not found');
  const sent = await runDeadlineReminders();
  return res.json({ success: true, data: { sent } });
});
