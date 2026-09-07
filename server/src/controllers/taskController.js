const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { can } = require('../middleware/authorize');
const { notifyUser, recordActivity } = require('../services/internal');
const { emitToProject } = require('../lib/realtime');

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const taskInclude = {
  assignee: { select: { id: true, name: true, avatar: true } },
  creator: { select: { id: true, name: true, avatar: true } },
  labels: { include: { label: true } },
  _count: { select: { comments: true, attachments: true } },
};

// We capture project name for richer notifications.
const getProjectName = async (projectId) => {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  return p ? p.name : 'project';
};

// Derive a canonical status from a column title.
function statusFromColumnTitle(title = '') {
  const t = title.toUpperCase();
  if (t.includes('DONE')) return 'DONE';
  if (t.includes('PROGRESS')) return 'IN_PROGRESS';
  if (t.includes('BACKLOG')) return 'BACKLOG';
  return 'TODO';
}

exports.list = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ column: { position: 'asc' } }, { position: 'asc' }],
    include: taskInclude,
  });
  return res.json({ success: true, data: tasks });
});

exports.get = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.task.id },
    include: taskInclude,
  });
  return res.json({ success: true, data: task });
});

exports.create = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can create tasks');
  }
  const { projectId } = req.params;
  const projectName = await getProjectName(projectId);

  // Determine column & status. If a columnId is provided, derive status from
  // the column; otherwise fall back to provided status (or TODO).
  let columnId = req.body.columnId || null;
  let status = req.body.status || null;
  if (columnId) {
    const column = await prisma.column.findFirst({ where: { id: columnId, board: { projectId } } });
    if (!column) throw new AppError(400, 'Invalid column');
    if (!status) status = statusFromColumnTitle(column.title);
  } else if (!status) {
    status = 'TODO';
  }

  // Position at the end of the target column.
  let position = 0;
  if (columnId) {
    const agg = await prisma.task.aggregate({ where: { columnId }, _max: { position: true } });
    position = (agg._max.position || -1) + 1;
  }

  // Validate assignee belongs to project.
  if (req.body.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.body.assigneeId } },
    });
    if (!member) throw new AppError(400, 'Assignee is not a project member');
  }

  const data = {
    projectId,
    title: req.body.title,
    description: req.body.description || null,
    status,
    priority: req.body.priority || 'MEDIUM',
    position,
    creatorId: req.user.id,
    assigneeId: req.body.assigneeId || null,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    columnId,
    ...(req.body.labelIds && req.body.labelIds.length
      ? { labels: { create: req.body.labelIds.map((l) => ({ labelId: l })) } }
      : {}),
  };

  const task = await prisma.task.create({ data, include: taskInclude });

  if (req.body.assigneeId && req.body.assigneeId !== req.user.id) {
    await notifyUser({
      userId: req.body.assigneeId,
      projectId,
      taskId: task.id,
      type: 'TASK_ASSIGNED',
      title: `${req.user.name} assigned you a task`,
      body: task.title,
    });
  }
  await recordActivity({
    projectId,
    userId: req.user.id,
    action: 'task.created',
    details: `Created "${task.title}" in ${projectName}`,
    taskId: task.id,
  });
  emitToProject(projectId, 'task.created', task);

  return res.status(201).json({ success: true, data: task });
});

exports.update = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const id = taskId;
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can edit tasks');
  }
  if (req.task.projectId !== req.project.id) throw new AppError(403, 'Not your project');

  const prev = req.task;
  const changes = {};

  if (req.body.title !== undefined) changes.title = req.body.title;
  if (req.body.description !== undefined) changes.description = req.body.description;
  if (req.body.priority !== undefined) changes.priority = req.body.priority;
  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) throw new AppError(400, 'Invalid status');
    changes.status = req.body.status;
  }
  if (req.body.dueDate !== undefined) {
    changes.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  }
  if (req.body.assigneeId !== undefined) {
    if (req.body.assigneeId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.project.id, userId: req.body.assigneeId } },
      });
      if (!member) throw new AppError(400, 'Assignee is not a project member');
    }
    changes.assigneeId = req.body.assigneeId || null;
  }
  if (req.body.columnId !== undefined) {
    if (req.body.columnId) {
      const column = await prisma.column.findFirst({
        where: { id: req.body.columnId, board: { projectId: req.project.id } },
      });
      if (!column) throw new AppError(400, 'Invalid column');
    }
    changes.columnId = req.body.columnId || null;
  }

  let labelChanges = null;
  if (Array.isArray(req.body.labelIds)) {
    const uniqueIds = [...new Set(req.body.labelIds)];
    const projectLabels = await prisma.label.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, projectId: true },
    });
    const valid = projectLabels.filter((l) => l.projectId === req.project.id).map((l) => l.id);
    if (valid.length !== uniqueIds.length) throw new AppError(400, 'Invalid labels');
    // `labelChanges` becomes the exact set to apply; an empty array clears all.
    labelChanges = uniqueIds;
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...changes,
      ...(labelChanges !== null
        ? {
            labels: {
              deleteMany: {},
              create: labelChanges.map((l) => ({ labelId: l })),
            },
          }
        : {}),
    },
    include: taskInclude,
  });

  // Notifications for assignment and status changes.
  if (changes.assigneeId && changes.assigneeId !== req.user.id && changes.assigneeId !== prev.assigneeId) {
    await notifyUser({
      userId: changes.assigneeId,
      projectId: req.project.id,
      taskId: id,
      type: 'TASK_ASSIGNED',
      title: `${req.user.name} assigned you a task`,
      body: task.title,
    });
  }
  if (changes.status && changes.status !== prev.status) {
    if (prev.assigneeId && prev.assigneeId !== req.user.id) {
      await notifyUser({
        userId: prev.assigneeId,
        projectId: req.project.id,
        taskId: id,
        type: 'TASK_MOVED',
        title: `Task #${task.id.slice(-4).toUpperCase()} moved`,
        body: `${task.title} → ${changes.status}`,
      });
    }
  }

  const changedFields = Object.keys(changes);
  if (changedFields.length) {
    await recordActivity({
      projectId: req.project.id,
      userId: req.user.id,
      action: 'task.updated',
      details: `Updated "${task.title}" (${changedFields.join(', ')})`,
      taskId: id,
    });
  }
  emitToProject(req.project.id, 'task.updated', task);

  return res.json({ success: true, data: task });
});

exports.remove = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const id = taskId;
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can delete tasks');
  }
  const title = req.task.title;
  await prisma.task.delete({ where: { id } });
  await recordActivity({
    projectId: req.project.id,
    userId: req.user.id,
    action: 'task.deleted',
    details: `Deleted "${title}"`,
  });
  emitToProject(req.project.id, 'task.deleted', { id });
  return res.json({ success: true, data: { message: 'Task deleted' } });
});

exports.move = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const id = taskId;
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can move tasks');
  }
  const { columnId, status, position } = req.body;

  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { projectId: req.project.id } },
  });
  if (!column) throw new AppError(400, 'Invalid column');

  const derivedStatus = statusFromColumnTitle(column.title);
  const requestedStatus = status && STATUSES.includes(status) ? status : derivedStatus;

  const columnTasks = await prisma.task.findMany({ where: { columnId }, orderBy: { position: 'asc' } });
  let newPosition = 0;
  if (position !== undefined && position >= 0 && position < columnTasks.length) {
    newPosition = position;
  } else {
    newPosition = columnTasks.length;
  }

  await prisma.$transaction(async (tx) => {
    // Remove from old column order.
    if (req.task.columnId === columnId) {
      const others = columnTasks.filter((t) => t.id !== id);
      for (let i = 0; i < others.length; i += 1) {
        await tx.task.update({ where: { id: others[i].id }, data: { position: i } });
      }
    }

    // Update target task.
    const target = await tx.task.update({
      where: { id },
      data: { columnId, status: requestedStatus, position: newPosition },
      include: taskInclude,
    });

    // Bump tasks after the insert point in the target column.
    const moving = columnTasks.filter((t) => t.id !== id);
    for (let i = 0; i < moving.length; i += 1) {
      let p = i;
      if (p >= newPosition) p += 1;
      await tx.task.update({ where: { id: moving[i].id }, data: { position: p } });
    }
    return target;
  }).then((target) => {
    const previousStatus = req.task.status;
    if (previousStatus !== requestedStatus && req.task.assigneeId && req.task.assigneeId !== req.user.id) {
      notifyUser({
        userId: req.task.assigneeId,
        projectId: req.project.id,
        taskId: id,
        type: 'TASK_MOVED',
        title: `Task #${id.slice(-4).toUpperCase()} moved`,
        body: `${target.title} → ${requestedStatus}`,
      });
    }
    recordActivity({
      projectId: req.project.id,
      userId: req.user.id,
      action: 'task.moved',
      details: `Moved "${target.title}" → ${requestedStatus}`,
      taskId: id,
    });
    emitToProject(req.project.id, 'task.moved', target);
    return res.json({ success: true, data: target });
  });
});
