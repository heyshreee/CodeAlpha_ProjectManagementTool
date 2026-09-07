const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');

// Calendar view: tasks with due dates for projects the user belongs to,
// optionally filtered by a single project.
exports.calendar = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const whereProject = projectId ? { id: projectId } : null;

  // Verify membership when filtered to one project.
  if (projectId) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this project' });
    }
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      dueDate: { not: null },
      ...(whereProject ? { projectId: whereProject.id } : {}),
    },
    orderBy: { dueDate: 'asc' },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  // Build a year-month day map: { "2026-09": [ {day, tasks} ] }
  const byMonth = {};
  for (const t of tasks) {
    const d = new Date(t.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = {};
    const day = d.getDate();
    if (!byMonth[key][day]) byMonth[key][day] = [];
    byMonth[key][day].push(t);
  }

  return res.json({ success: true, data: { byMonth } });
});
