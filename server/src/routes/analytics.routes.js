const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiters');
const analyticsC = require('../controllers/analyticsController');
const searchC = require('../controllers/searchController');
const calendarC = require('../controllers/calendarController');

router.use(authenticate);

router.get('/dashboard', analyticsC.dashboard);
router.get('/search', searchLimiter, searchC.search);
router.get('/calendar', calendarC.calendar);

module.exports = router;
