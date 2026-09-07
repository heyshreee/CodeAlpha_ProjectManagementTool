const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { can } = require('../middleware/authorize');

exports.list = asyncHandler(async (req, res) => {
  const labels = await prisma.label.findMany({
    where: { projectId: req.project.id },
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: labels });
});

exports.create = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can create labels');
  }
  const existing = await prisma.label.findUnique({
    where: { projectId_name: { projectId: req.project.id, name: req.body.name } },
  });
  if (existing) throw new AppError(409, 'A label with that name already exists');

  const label = await prisma.label.create({
    data: { projectId: req.project.id, name: req.body.name, color: req.body.color || null },
  });
  return res.status(201).json({ success: true, data: label });
});

exports.update = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can edit labels');
  }
  const { labelId } = req.params;
  const label = await prisma.label.findFirst({ where: { id: labelId, projectId: req.project.id } });
  if (!label) throw new AppError(404, 'Label not found in this project');
  if (req.body.name !== undefined && req.body.name !== label.name) {
    const clash = await prisma.label.findUnique({
      where: { projectId_name: { projectId: req.project.id, name: req.body.name } },
    });
    if (clash) throw new AppError(409, 'A label with that name already exists');
  }
  // Whitelist fields; never apply raw req.body.
  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.color !== undefined) data.color = req.body.color;
  const updated = await prisma.label.update({ where: { id: labelId }, data });
  return res.json({ success: true, data: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can delete labels');
  }
  const { labelId } = req.params;
  const label = await prisma.label.findFirst({ where: { id: labelId, projectId: req.project.id } });
  if (!label) throw new AppError(404, 'Label not found in this project');
  await prisma.label.delete({ where: { id: labelId } });
  return res.json({ success: true, data: { message: 'Label deleted' } });
});
