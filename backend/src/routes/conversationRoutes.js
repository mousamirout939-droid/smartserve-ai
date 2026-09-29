const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listConversations, getConversationByPhone } = require('../controllers/conversationController');

router.get('/', requireAuth, listConversations);
router.get('/:phone', requireAuth, getConversationByPhone);

module.exports = router;
