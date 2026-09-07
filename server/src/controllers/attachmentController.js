const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { can } = require('../middleware/authorize');
const { sanitizeFilename, verifyMagicBytes, ALLOWED_MIME } = require('../middleware/upload');
const env = require('../config/env');
const { recordActivity } = require('../services/internal');
const { emitToProject } = require('../lib/realtime');

exports.list = asyncHandler(async (req, res) => {
  const attachments = await prisma.attachment.findMany({
    where: { taskId: req.task.id },
    orderBy: { createdAt: 'desc' },
    include: { uploader: { select: { id: true, name: true, avatar: true } } },
  });
  return res.json({ success: true, data: attachments });
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file provided');

  const task = await prisma.task.findUnique({ where: { id: req.task.id } });
  const safeName = sanitizeFilename(req.file.originalname);

  // Verify actual file content is not trying to masquerade as an allow-listed
  // type. Where magic bytes cannot be matched, reject rather than trust the
  // client-supplied MIME/extension.
  let buffer;
  if (req.file.buffer) {
    buffer = req.file.buffer;
  } else {
    buffer = fs.readFileSync(req.file.path);
  }
  const detectedType = await verifyMagicBytes(buffer);
  if (detectedType !== null) {
    if (!ALLOWED_MIME.has(detectedType)) {
      throw new AppError(400, 'File content is not an allowed type');
    }
  } else if (!req.file.mimetype.startsWith('text/')) {
    // Non-text file whose magic bytes we could not verify → reject to be safe.
    throw new AppError(400, 'Could not verify file content');
  }

  const attachment = await prisma.attachment.create({
    data: {
      taskId: req.task.id,
      uploaderId: req.user.id,
      filename: req.file.filename,
      originalName: safeName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey: req.file.filename,
    },
    include: { uploader: { select: { id: true, name: true, avatar: true } } },
  });

  await recordActivity({
    projectId: task.projectId,
    userId: req.user.id,
    action: 'attachment.added',
    details: `Attached "${safeName}" to "${task.title}"`,
    taskId: task.id,
  });
  emitToProject(task.projectId, 'attachment.created', attachment);

  return res.status(201).json({ success: true, data: attachment });
});

exports.download = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, taskId: req.task.id },
  });
  if (!attachment) throw new AppError(404, 'Attachment not found');

  if (env.storage.driver === 'local') {
    const filePath = path.join(env.storage.localDir, attachment.filename);
    if (!fs.existsSync(filePath)) throw new AppError(404, 'File missing on storage');
    // Force no-sniff so the browser never guesses an active content type, and
    // inline-display only safe preview types; everything else downloads.
    const disposition = attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf'
      ? 'inline'
      : 'attachment';
    const rfcName = encodeURIComponent(attachment.originalName);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${attachment.originalName}"; filename*=UTF-8''${rfcName}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  }

  // Object-storage driver not configured in this dev environment.
  throw new AppError(501, 'Download storage driver not configured');
});

exports.remove = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;
  const task = await prisma.task.findUnique({ where: { id: req.task.id } });
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, taskId: req.task.id },
  });
  if (!attachment) throw new AppError(404, 'Attachment not found');
  if (attachment.uploaderId !== req.user.id && !can(req.membership.role, 'ADMIN')) {
    throw new AppError(403, 'You can only delete attachments you uploaded');
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  if (env.storage.driver === 'local') {
    try {
      const filePath = path.join(env.storage.localDir, attachment.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  await recordActivity({
    projectId: task.projectId,
    userId: req.user.id,
    action: 'attachment.removed',
    details: `Removed "${attachment.originalName}"`,
    taskId: task.id,
  });
  return res.json({ success: true, data: { message: 'Attachment deleted' } });
});
