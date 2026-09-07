const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');

// Aggregated analytics for a project the user belongs to.
exports.projectAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tasks = await prisma.task.findMany({
    where: { projectId: id },
    select: { status: true, priority: true, dueDate: true, assigneeId: true, createdAt: true },
  });

  const total = tasks.length;
  const byStatus = {
    BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, DONE: 0,
  };
  const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  const today = new Date();
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  const completed = byStatus.DONE;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  // Member workload: count tasks per assignee.
  const assigneeIds = [...new Set(tasks.filter((t) => t.assigneeId).map((t) => t.assigneeId))];
  const members = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, name: true, avatar: true },
  });
  const workload = members.map((m) => ({
    ...m,
    assigned: tasks.filter((t) => t.assigneeId === m.id).length,
    completed: tasks.filter((t) => t.assigneeId === m.id && t.status === 'DONE').length,
  }));

  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'DONE').length;

  // Tasks completed over time (last 7 days) using createdAt as approximation
  // (activity log would be ideal; we use createdAt for simplicity).
  const last7 = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    last7.push({
      date: day.toISOString().slice(0, 10),
      created: tasks.filter((t) => {
        const c = new Date(t.createdAt);
        return (
          c.getFullYear() === day.getFullYear() &&
          c.getMonth() === day.getMonth() &&
          c.getDate() === day.getDate()
        );
      }).length,
    });
  }

  return res.json({
    success: true,
    data: {
      total,
      byStatus,
      byPriority,
      completed,
      completionRate,
      inProgress: byStatus.IN_PROGRESS,
      todo: byStatus.TODO,
      backlog: byStatus.BACKLOG,
      overdue,
      workload,
      last7,
    },
  });
});

// Global dashboard stats across all projects for the authenticated user.
exports.dashboard = asyncHandler(async (req, res) => {
  const membershipIds = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    select: { projectId: true },
  });
  const projectIds = membershipIds.map((m) => m.projectId);

  const [projects, tasks, assigned] = await Promise.all([
    projectIds.length
      ? prisma.project.findMany({ where: { id: { in: projectIds } }, orderBy: { updatedAt: 'desc' } })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.task.count({ where: { projectId: { in: projectIds } } })
      : Promise.resolve(0),
    prisma.task.count({ where: { assigneeId: req.user.id } }),
  ]);

  const today = new Date();
  const [completed, myCompleted, overdue, upcoming] = await Promise.all([
    prisma.task.count({
      where: { projectId: { in: projectIds }, status: 'DONE' },
    }),
    prisma.task.count({ where: { assigneeId: req.user.id, status: 'DONE' } }),
    prisma.task.count({
      where: { projectId: { in: projectIds }, dueDate: { lt: today }, status: { not: 'DONE' } },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: today },
        status: { not: 'DONE' },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  return res.json({
    success: true,
    data: {
      totalProjects: projects.length,
      totalTasks: tasks,
      assignedTasks: assigned,
      myCompleted,
      completedTasks: completed,
      overdueTasks: overdue,
      upcomingDeadlines: upcoming,
      recentProjects: projects.slice(0, 4),
    },
  });
});
