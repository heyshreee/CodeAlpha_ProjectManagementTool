const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const activities = await prisma.activity.findMany({
    where: { projectId: req.project.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  return res.json({ success: true, data: activities });
});
