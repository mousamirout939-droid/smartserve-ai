const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listOrders, getOrder, createOrderManual, updateOrderStatus } = require('../controllers/orderController');

router.get('/', requireAuth, listOrders);
router.get('/:id', requireAuth, getOrder);
router.post('/', requireAuth, createOrderManual);
router.put('/:id/status', requireAuth, updateOrderStatus);

module.exports = router;
