const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { can } = require('../middleware/authorize');
const { recordActivity } = require('../services/internal');

// Boards are optional higher-level containers. The core Kanban uses a single
// default board per project. These endpoints use the project-scoped guard.

exports.list = asyncHandler(async (req, res) => {
  const boards = await prisma.board.findMany({
    where: { projectId: req.project.id },
    include: { columns: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ success: true, data: boards });
});

exports.create = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can create boards');
  }
  const board = await prisma.board.create({
    data: { projectId: req.project.id, name: req.body.name },
  });
  return res.status(201).json({ success: true, data: board });
});

exports.listBoardTasks = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const board = await prisma.board.findFirst({
    where: { id: boardId, projectId: req.project.id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              assignee: { select: { id: true, name: true, avatar: true } },
              creator: { select: { id: true, name: true, avatar: true } },
              labels: { include: { label: true } },
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
    },
  });
  if (!board) throw new AppError(404, 'Board not found in this project');

  return res.json({ success: true, data: board });
});

exports.createColumn = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can manage columns');
  }
  const { boardId } = req.params;
  const board = await prisma.board.findFirst({ where: { id: boardId, projectId: req.project.id } });
  if (!board) throw new AppError(404, 'Board not found in this project');

  const last = await prisma.column.aggregate({
    where: { boardId },
    _max: { position: true },
  });
  const column = await prisma.column.create({
    data: { boardId, title: req.body.title, color: req.body.color || null, position: (last._max.position || -1) + 1 },
  });

  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'column.created',
    details: `Created column "${column.title}"`,
  });
  return res.status(201).json({ success: true, data: column });
});

exports.updateColumn = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can manage columns');
  }
  const { columnId } = req.params;
  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { projectId: req.project.id } },
  });
  if (!column) throw new AppError(404, 'Column not found');
  // Only allow the whitelisted fields; never apply raw req.body.
  const data = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.color !== undefined) data.color = req.body.color;
  const updated = await prisma.column.update({ where: { id: columnId }, data });
  return res.json({ success: true, data: updated });
});

exports.deleteColumn = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can manage columns');
  }
  const { columnId } = req.params;
  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { projectId: req.project.id } },
  });
  if (!column) throw new AppError(404, 'Column not found');
  await prisma.column.delete({ where: { id: columnId } });
  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'column.deleted',
    details: `Deleted column "${column.title}"`,
  });
  return res.json({ success: true, data: { message: 'Column deleted' } });
});

exports.reorderColumns = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can reorder columns');
  }
  const { boardId } = req.params;
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    throw new AppError(400, 'orderedIds must be an array');
  }

  // A member must never be able to reorder columns of a board outside this
  // project, or inject arbitrary column ids. Verify the board belongs to this
  // project, then that every id belongs to it and the list is a permutation.
  const board = await prisma.board.findFirst({ where: { id: boardId, projectId: req.project.id } });
  if (!board) throw new AppError(404, 'Board not found in this project');

  const columns = await prisma.column.findMany({ where: { boardId } });
  const idsInBoard = new Set(columns.map((c) => c.id));
  if (
    orderedIds.length !== columns.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !idsInBoard.has(id))
  ) {
    throw new AppError(400, 'Invalid column order');
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.column.update({ where: { id }, data: { position: index } })
    )
  );
  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'column.reordered',
    details: 'Reordered columns',
  });
  return res.json({ success: true, data: { message: 'Columns reordered' } });
});
