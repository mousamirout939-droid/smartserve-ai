const express = require('express');
const { requireCustomerAuth } = require('../middleware/customerAuth');
const {
  me,
  listMyOrders,
  getMyOrder,
  createOrder,
  createPayment,
  verifyPayment,
} = require('../controllers/customerPortalController');

const router = express.Router();
router.use(requireCustomerAuth);
router.get('/me', me);
router.get('/orders', listMyOrders);
router.get('/orders/:id', getMyOrder);
router.post('/orders', createOrder);
router.post('/orders/:id/payment', createPayment);
router.post('/payments/verify', verifyPayment);

module.exports = router;
