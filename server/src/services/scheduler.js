const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// Find tasks due within the next 24h and notify assignees/creators once.
async function runDeadlineReminders() {
  try {
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await prisma.task.findMany({
      where: { dueDate: { gte: start, lte: end }, status: { not: 'DONE' } },
      select: { id: true, title: true, projectId: true, assigneeId: true, creatorId: true },
    });

    let sent = 0;
    for (const task of tasks) {
      const targets = [...new Set([task.assigneeId, task.creatorId].filter(Boolean))];
      for (const userId of targets) {
        const existing = await prisma.notification.findFirst({
          where: { userId, taskId: task.id, type: 'DEADLINE_REMINDER' },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId,
              projectId: task.projectId,
              taskId: task.id,
              type: 'DEADLINE_REMINDER',
              title: 'Your task deadline is tomorrow',
              body: task.title,
            },
          });
          sent += 1;
        }
      }
    }
    if (sent) logger.info({ sent }, 'Deadline reminders generated');
    return sent;
  } catch (error) {
    logger.error({ err: error }, 'Deadline reminder run failed');
    return 0;
  }
}

module.exports = { runDeadlineReminders };
