const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureProjectAccess, ensureTaskAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { taskSchema, updateTaskSchema, moveTaskSchema } = require('../validators/taskValidators');

const taskC = require('../controllers/taskController');

// Mounted at /projects/:projectId/tasks
router.use(authenticate);

// Project-scoped list/create
router.get('/', ensureProjectAccess({ role: 'VIEWER' }), taskC.list);
router.post('/', ensureProjectAccess({ role: 'MEMBER' }), validate(taskSchema), taskC.create);

// Item routes guarded by BOLA check (member of the task's project)
router.get('/:taskId', ensureTaskAccess({ role: 'VIEWER' }), taskC.get);
router.patch('/:taskId', ensureTaskAccess({ role: 'MEMBER' }), validate(updateTaskSchema), taskC.update);
router.delete('/:taskId', ensureTaskAccess({ role: 'MEMBER' }), taskC.remove);
router.patch('/:taskId/move', ensureTaskAccess({ role: 'MEMBER' }), validate(moveTaskSchema), taskC.move);

module.exports = router;
