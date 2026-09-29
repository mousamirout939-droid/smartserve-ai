const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listCustomers, getCustomer } = require('../controllers/customerController');

router.get('/', requireAuth, listCustomers);
router.get('/:id', requireAuth, getCustomer);

module.exports = router;
