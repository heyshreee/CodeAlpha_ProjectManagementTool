const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureTaskAccess, ensureAttachmentAccess } = require('../middleware/authorize');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');

const attachmentC = require('../controllers/attachmentController');

// Mounted at /tasks/:taskId/attachments
router.use(authenticate);

router.get('/', ensureTaskAccess({ role: 'VIEWER' }), attachmentC.list);
router.post('/', ensureTaskAccess({ role: 'MEMBER' }), uploadLimiter, upload.single('file'), attachmentC.upload);

// Item ops.
router.get('/:attachmentId/download', ensureAttachmentAccess({ role: 'VIEWER' }), attachmentC.download);
router.delete('/:attachmentId', ensureAttachmentAccess({ role: 'MEMBER' }), attachmentC.remove);

// Top-level item router mounted at /attachments so both documented paths work:
//   GET    /api/v1/attachments/:id/download
//   DELETE /api/v1/attachments/:id
// and the task-scoped variants above.
const itemRouter = express.Router();
itemRouter.use(authenticate);
itemRouter.get('/:attachmentId/download', ensureAttachmentAccess({ role: 'VIEWER' }), attachmentC.download);
itemRouter.delete('/:attachmentId', ensureAttachmentAccess({ role: 'MEMBER' }), attachmentC.remove);

module.exports = router;
module.exports.itemRouter = itemRouter;
