const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', c.list);
router.patch('/:id/read', c.markRead);
router.post('/read-all', c.markAllRead);
router.post('/run-deadline-reminders', c.runDeadlineReminders);

module.exports = router;
