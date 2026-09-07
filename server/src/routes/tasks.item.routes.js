const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureTaskAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { updateTaskSchema, moveTaskSchema } = require('../validators/taskValidators');

const taskC = require('../controllers/taskController');

// Mounted at /tasks — standalone item access guarded by BOLA check.
router.use(authenticate);

router.param('taskId', function (req, _res, next, value) {
  req.params.id = value;
  return next();
});
router.get('/:taskId', ensureTaskAccess({ role: 'VIEWER' }), taskC.get);
router.patch('/:taskId', ensureTaskAccess({ role: 'MEMBER' }), validate(updateTaskSchema), taskC.update);
router.delete('/:taskId', ensureTaskAccess({ role: 'MEMBER' }), taskC.remove);
router.patch('/:taskId/move', ensureTaskAccess({ role: 'MEMBER' }), validate(moveTaskSchema), taskC.move);

module.exports = router;
