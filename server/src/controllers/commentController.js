const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { can } = require('../middleware/authorize');
const { notifyUser, recordActivity } = require('../services/internal');
const { emitToProject } = require('../lib/realtime');

const commentInclude = {
  user: { select: { id: true, name: true, avatar: true } },
};

// Pull @Name tokens out of comment content. Matching is name-based and
// validated against actual project members server-side.
function extractMentions(content) {
  const mentions = content.match(/@([A-Za-z0-9_.-]{2,40})/g) || [];
  return mentions.map((m) => m.slice(1));
}

exports.list = asyncHandler(async (req, res) => {
  const comments = await prisma.comment.findMany({
    where: { taskId: req.task.id },
    orderBy: { createdAt: 'asc' },
    include: commentInclude,
  });
  return res.json({ success: true, data: comments });
});

exports.create = asyncHandler(async (req, res) => {
  if (!can(req.membership.role, 'MEMBER')) {
    throw new AppError(403, 'Only members can comment');
  }
  const comment = await prisma.comment.create({
    data: { taskId: req.task.id, userId: req.user.id, content: req.body.content },
    include: commentInclude,
  });

  // Notify the assignee & creator if they're not the commenter.
  const task = await prisma.task.findUnique({
    where: { id: req.task.id },
    select: { id: true, assigneeId: true, creatorId: true, title: true },
  });
  const targets = [task.assigneeId, task.creatorId].filter(
    (u) => u && u !== req.user.id
  );

  // @mention support: resolve "@Name" mentions to project members (server-side,
  // so mention notifications can never be spoofed by arbitrary user ids).
  const mentions = extractMentions(req.body.content);
  const members = await prisma.projectMember.findMany({
    where: { projectId: req.task.projectId },
    include: { user: { select: { id: true, name: true } } },
  });
  const normalized = new Set(mentions.map((m) => m.toLowerCase()));
  const mentioning = members.filter((m) => normalized.has(m.user.name.toLowerCase()));
  for (const m of mentioning) {
    if (m.userId !== req.user.id) targets.push(m.userId);
  }

  const unique = [...new Set(targets)];
  for (const target of unique) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.task.projectId, userId: target } },
    });
    if (member) {
      const type = mentioning.some((m) => m.userId === target)
        ? 'COMMENT_MENTION'
        : 'TASK_COMMENTED';
      await notifyUser({
        userId: target,
        projectId: req.task.projectId,
        taskId: task.id,
        type,
        title: type === 'COMMENT_MENTION'
          ? `${req.user.name} mentioned you in a comment`
          : `${req.user.name} commented on your task`,
        body: task.title,
      });
    }
  }

  await recordActivity({
    projectId: req.task.projectId,
    userId: req.user.id,
    action: 'comment.created',
    details: `Commented on "${task.title}"`,
    taskId: task.id,
  });
  emitToProject(req.task.projectId, 'comment.created', comment);
  return res.status(201).json({ success: true, data: comment });
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const comment = await prisma.comment.findFirst({
    where: { id, taskId: req.task.id },
  });
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.userId !== req.user.id) throw new AppError(403, 'You can only edit your own comments');

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: req.body.content },
    include: commentInclude,
  });
  emitToProject(req.task.projectId, 'comment.updated', updated);
  return res.json({ success: true, data: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const comment = await prisma.comment.findFirst({
    where: { id, taskId: req.task.id },
  });
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.userId !== req.user.id) throw new AppError(403, 'You can only delete your own comments');

  await prisma.comment.delete({ where: { id } });
  emitToProject(req.task.projectId, 'comment.deleted', { id });
  return res.json({ success: true, data: { message: 'Comment deleted' } });
});
