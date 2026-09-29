const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDashboardSummary, getAiAnalytics } = require('../controllers/analyticsController');

router.get('/dashboard', requireAuth, getDashboardSummary);
router.get('/ai-insights', requireAuth, getAiAnalytics);

module.exports = router;
