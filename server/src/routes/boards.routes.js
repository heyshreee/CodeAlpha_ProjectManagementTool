const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureProjectAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { boardSchema, columnSchema, reorderSchema } = require('../validators/projectValidators');

const boardC = require('../controllers/boardController');

router.use(authenticate);

// Boards are scoped under a project.
router.get('/', ensureProjectAccess({ role: 'VIEWER' }), boardC.list);
router.post('/', ensureProjectAccess({ role: 'MEMBER' }), validate(boardSchema), boardC.create);

router.get('/:boardId', ensureProjectAccess({ role: 'VIEWER' }), boardC.listBoardTasks);
router.post('/:boardId/columns', ensureProjectAccess({ role: 'MEMBER' }), validate(columnSchema), boardC.createColumn);
// reorder must be declared before the /:columnId param route so it is not
// shadowed by updateColumn.
router.patch('/:boardId/columns/reorder', ensureProjectAccess({ role: 'MEMBER' }), validate(reorderSchema), boardC.reorderColumns);
router.patch('/:boardId/columns/:columnId', ensureProjectAccess({ role: 'MEMBER' }), validate(columnSchema), boardC.updateColumn);
router.delete('/:boardId/columns/:columnId', ensureProjectAccess({ role: 'MEMBER' }), boardC.deleteColumn);

module.exports = router;
