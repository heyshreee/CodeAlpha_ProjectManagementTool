const express = require('express');
const router = express.Router({ mergeParams: true });

const { authenticate } = require('../middleware/auth');
const { ensureProjectAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { z } = require('zod');

const labelC = require('../controllers/labelController');

const labelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

router.use(authenticate);

router.get('/', ensureProjectAccess({ role: 'VIEWER' }), labelC.list);
router.post('/', ensureProjectAccess({ role: 'MEMBER' }), validate(labelSchema), labelC.create);
router.patch('/:labelId', ensureProjectAccess({ role: 'MEMBER' }), validate(labelSchema), labelC.update);
router.delete('/:labelId', ensureProjectAccess({ role: 'MEMBER' }), labelC.remove);

module.exports = router;
