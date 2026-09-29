const express = require('express');
const router = express.Router();
const { processMessage } = require('../controllers/n8nController');

router.post('/process-message', processMessage);

module.exports = router;
