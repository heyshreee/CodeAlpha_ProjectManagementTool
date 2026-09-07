const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');

const ROLE_RANK = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

// Role hierarchy: higher can perform everything lower can.
function can(role, minimum) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// ensureProjectAccess(role = 'VIEWER'):
//  Validates the current project id AND that req.user is a member with at least
//  `role`. Attaches req.project and req.membership. This is the BOLA/IDOR guard:
//  a user cannot act on a project merely by knowing its id — they must be a member
//  with sufficient role.
function ensureProjectAccess({ role = 'VIEWER' } = {}) {
  return async function (req, _res, next) {
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) return next(new AppError(400, 'Project id is required'));

    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return next(new AppError(404, 'Project not found'));

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.id } },
      });
      if (!membership) {
        return next(new AppError(403, 'You are not a member of this project'));
      }
      if (!can(membership.role, role)) {
        return next(new AppError(403, 'You do not have permission to perform this action'));
      }

      req.project = project;
      req.membership = membership;
      return next();
    } catch (error) {
      return next(new AppError(500, 'Unable to verify project access'));
    }
  };
}

// ensureTaskAccess(role, resolveProject=true):
//  Validates a task belongs to a project, the user is a member with role, and
//  attaches req.task & req.project. Guards /api/v1/tasks/:id style routes.
function ensureTaskAccess({ role = 'VIEWER' } = {}) {
  return async function (req, _res, next) {
    const taskId = req.params.taskId || req.params.id;
    if (!taskId) return next(new AppError(400, 'Task id is required'));

    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return next(new AppError(404, 'Task not found'));

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
      });
      if (!membership) {
        return next(new AppError(403, 'You are not a member of this project'));
      }
      if (!can(membership.role, role)) {
        return next(new AppError(403, 'You do not have permission to perform this action'));
      }

      req.task = task;
      req.project = { id: task.projectId };
      req.membership = membership;
      return next();
    } catch (error) {
      return next(new AppError(500, 'Unable to verify task access'));
    }
  };
}

// ensureAttachmentAccess(role):
//  Validates an attachment belongs to a task the user is a member of with at
//  least `role`, and attaches req.attachment, req.task & req.project. Guards
//  /api/v1/attachments/:id style routes (download/delete).
function ensureAttachmentAccess({ role = 'VIEWER' } = {}) {
  return async function (req, _res, next) {
    const attachmentId = req.params.attachmentId || req.params.id;
    if (!attachmentId) return next(new AppError(400, 'Attachment id is required'));

    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { task: true },
      });
      if (!attachment) return next(new AppError(404, 'Attachment not found'));

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: attachment.task.projectId, userId: req.user.id } },
      });
      if (!membership) {
        return next(new AppError(403, 'You are not a member of this project'));
      }
      if (!can(membership.role, role)) {
        return next(new AppError(403, 'You do not have permission to perform this action'));
      }

      req.attachment = attachment;
      req.task = attachment.task;
      req.project = { id: attachment.task.projectId };
      req.membership = membership;
      return next();
    } catch (error) {
      return next(new AppError(500, 'Unable to verify attachment access'));
    }
  };
}

module.exports = { ensureProjectAccess, ensureTaskAccess, ensureAttachmentAccess, can, ROLE_RANK };
