const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { ensureProjectAccess } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { projectSchema, updateProjectSchema, inviteMemberSchema, updateMemberRoleSchema } = require('../validators/projectValidators');

const projectC = require('../controllers/projectController');
const activityC = require('../controllers/activityController');
const analyticsC = require('../controllers/analyticsController');

router.use(authenticate);

// Projects list / create
router.get('/', projectC.list);
router.post('/', validate(projectSchema), projectC.create);

// Project-scoped access (BOLA guard)
router.param('id', function (req, _res, next, value) {
  req.params.projectId = value;
  return next();
});

router.get('/:id', ensureProjectAccess({ role: 'VIEWER' }), projectC.get);
router.patch('/:id', ensureProjectAccess({ role: 'ADMIN' }), validate(updateProjectSchema), projectC.update);
router.delete('/:id', ensureProjectAccess({ role: 'OWNER' }), projectC.remove);

// Members
router.get('/:id/members', ensureProjectAccess({ role: 'VIEWER' }), projectC.listMembers);
router.post('/:id/members', ensureProjectAccess({ role: 'ADMIN' }), validate(inviteMemberSchema), projectC.inviteMember);
router.patch('/:id/members/:memberId', ensureProjectAccess({ role: 'ADMIN' }), validate(updateMemberRoleSchema), projectC.updateMemberRole);
router.delete('/:id/members/:memberId', ensureProjectAccess({ role: 'ADMIN' }), projectC.removeMember);

// Activity timeline
router.get('/:id/activities', ensureProjectAccess({ role: 'VIEWER' }), activityC.list);

// Analytics
router.get('/:id/analytics', ensureProjectAccess({ role: 'VIEWER' }), analyticsC.projectAnalytics);

module.exports = router;
