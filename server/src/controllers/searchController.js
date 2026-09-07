const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');

// Global search scoped to projects the user belongs to.
exports.search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 1) {
    return res.json({ success: true, data: { tasks: [], projects: [], users: [] } });
  }
  // Bounded input prevents expensive/unbounded searches.
  if (q.length > 100) {
    return res.json({ success: true, data: { tasks: [], projects: [], users: [] } });
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 20,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds }, name: { contains: q } },
      take: 10,
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.user.findMany({
      where: { name: { contains: q } },
      take: 5,
      select: { id: true, name: true, avatar: true },
    }),
  ]);

  return res.json({ success: true, data: { tasks, projects, users } });
});
