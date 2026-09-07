const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { publicUser } = require('../middleware/auth');
const { can } = require('../middleware/authorize');
const { notifyUser, recordActivity } = require('../services/internal');

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatar: true } },
};

// ---- list / create ----

exports.list = asyncHandler(async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    include: {
      project: {
        include: {
          _count: { select: { members: true, tasks: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projects = memberships.map((m) => ({ ...m.project, role: m.role }));

  // Per-project completion so cards can render honest progress bars.
  const ids = projects.map((p) => p.id);
  if (ids.length) {
    const grouped = await prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: ids } },
      _count: { _all: true },
    });
    const perProject = new Map();
    for (const g of grouped) {
      if (!perProject.has(g.projectId)) perProject.set(g.projectId, { DONE: 0 });
      perProject.get(g.projectId)[g.status] = (perProject.get(g.projectId)[g.status] || 0) + g._count._all;
    }
    for (const p of projects) {
      const status = perProject.get(p.id) || {};
      const taskCount = Object.values(status).reduce((a, b) => a + b, 0);
      const completedCount = status.DONE || 0;
      p.completedCount = completedCount;
      p.taskCount = taskCount;
      p.completionRate = taskCount ? Math.round((completedCount / taskCount) * 100) : 0;
    }
  }

  return res.json({ success: true, data: projects });
});

exports.get = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      _count: { select: { tasks: true, members: true, boards: true } },
    },
  });
  // Attach the current user's role so the frontend can render permission-aware
  // controls (add members, create tasks, edit tasks, manage members).
  return res.json({ success: true, data: { ...project, role: req.membership.role } });
});

exports.create = asyncHandler(async (req, res) => {
  const project = await prisma.project.create({
    data: {
      name: req.body.name,
      description: req.body.description || null,
      color: req.body.color || null,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, role: 'OWNER' } },
    },
  });

  // Create a default board and its columns for a ready-to-use Kanban.
  const board = await prisma.board.create({ data: { projectId: project.id, name: 'Board' } });
  const statuses = [
    { title: 'Backlog', status: 'BACKLOG' },
    { title: 'To Do', status: 'TODO' },
    { title: 'In Progress', status: 'IN_PROGRESS' },
    { title: 'Done', status: 'DONE' },
  ];
  await prisma.column.createMany({
    data: statuses.map((s, i) => ({ boardId: board.id, title: s.title, position: i })),
  });

  await recordActivity({
    projectId: project.id,
    userId: req.user.id,
    action: 'project.created',
    details: `Created project "${project.name}"`,
  });

  const full = await exports.getInternal(project.id);
  return res.status(201).json({ success: true, data: full });
});

exports.getInternal = async (projectId) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      _count: { select: { tasks: true, members: true, boards: true } },
    },
  });
  return project;
};

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!can(req.membership.role, 'ADMIN')) {
    throw new AppError(403, 'Only admins can update project settings');
  }
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
    },
  });
  await recordActivity({
    projectId: id,
    userId: req.user.id,
    action: 'project.updated',
    details: `Updated project "${project.name}"`,
  });
  return res.json({ success: true, data: project });
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.membership.role !== 'OWNER') {
    throw new AppError(403, 'Only the project owner can delete the project');
  }
  await prisma.project.delete({ where: { id } });
  return res.json({ success: true, data: { message: 'Project deleted' } });
});

// ---- members ----

exports.listMembers = asyncHandler(async (req, res) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId: req.project.id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const mapped = members.map((m) => ({ id: m.id, role: m.role, createdAt: m.createdAt, user: publicUser(m.user) }));
  return res.json({ success: true, data: mapped });
});

exports.inviteMember = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'ADMIN')) {
    throw new AppError(403, 'Only admins can invite members');
  }
  const { email, role } = req.body;
  const target = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!target) throw new AppError(404, 'No user with that email exists yet');

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.project.id, userId: target.id } },
  });
  if (existing) throw new AppError(409, 'User is already a project member');

  if (role === 'OWNER') throw new AppError(400, 'Only one project owner is allowed');

  await prisma.projectMember.create({
    data: { projectId: req.project.id, userId: target.id, role },
  });

  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'member.added',
    details: `Invited ${target.name} as ${role}`,
  });
  await notifyUser({
    userId: target.id,
    projectId: req.project.id,
    type: 'MEMBER_ADDED',
    title: `You were added to ${req.project.name}`,
    body: `${req.user.name} invited you with role ${role}`,
  });

  return res.status(201).json({ success: true, data: { message: 'Member invited' } });
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'ADMIN')) {
    throw new AppError(403, 'Only admins can change member roles');
  }
  const { memberId } = req.params;
  const { role } = req.body;
  const membership = await prisma.projectMember.findUnique({ where: { id: memberId } });
  if (!membership || membership.projectId !== req.project.id) {
    throw new AppError(404, 'Member not found in this project');
  }
  if (membership.role === 'OWNER') {
    throw new AppError(403, 'The project owner role cannot be changed');
  }
  if (role === 'OWNER') throw new AppError(400, 'Cannot assign owner via this endpoint');

  await prisma.projectMember.update({ where: { id: memberId }, data: { role } });
  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'member.role',
    details: `Changed role to ${role}`,
  });
  return res.json({ success: true, data: { message: 'Role updated' } });
});

exports.removeMember = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'ADMIN')) {
    throw new AppError(403, 'Only admins can remove members');
  }
  const { memberId } = req.params;
  const membership = await prisma.projectMember.findUnique({ where: { id: memberId } });
  if (!membership || membership.projectId !== req.project.id) {
    throw new AppError(404, 'Member not found in this project');
  }
  if (membership.role === 'OWNER') {
    throw new AppError(403, 'The project owner cannot be removed');
  }
  if (membership.userId === req.user.id) {
    throw new AppError(400, 'You cannot remove yourself');
  }

  await prisma.projectMember.delete({ where: { id: memberId } });
  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'member.removed',
    details: `Removed member ${membership.userId}`,
  });
  await notifyUser({
    userId: membership.userId,
    projectId: req.project.id,
    type: 'MEMBER_REMOVED',
    title: `You were removed from ${req.project.name}`,
  });

  return res.json({ success: true, data: { message: 'Member removed' } });
});
