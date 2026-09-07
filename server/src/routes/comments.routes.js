const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureTaskAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { commentSchema } = require('../validators/taskValidators');

const commentC = require('../controllers/commentController');

// Mounted at /tasks/:taskId/comments
router.use(authenticate);

router.get('/', ensureTaskAccess({ role: 'VIEWER' }), commentC.list);
router.post('/', ensureTaskAccess({ role: 'MEMBER' }), validate(commentSchema), commentC.create);

// Item ops use a different param name to avoid clashing with :taskId.
router.param('commentId', function (req, _res, next, value) {
  req.params.id = value;
  return next();
});
router.patch('/:commentId', ensureTaskAccess({ role: 'MEMBER' }), validate(commentSchema), commentC.update);
router.delete('/:commentId', ensureTaskAccess({ role: 'MEMBER' }), commentC.remove);

module.exports = router;
