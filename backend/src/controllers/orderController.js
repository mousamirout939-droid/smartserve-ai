const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const whatsapp = require('../services/whatsappService');
const generateOrderId = require('../utils/generateOrderId');
const { calculateOrderTotal } = require('../services/orderCalc');

const VALID_STATUSES = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const listOrders = asyncHandler(async (req, res) => {
  const { status, phone, from, to, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (phone) filter.phone = phone;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 200);
  res.json({ success: true, data: orders });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    $or: [{ orderId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
  });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: order });
});

// Manual order creation from the admin dashboard (e.g. phone orders taken by staff)
const createOrderManual = asyncHandler(async (req, res) => {
  const { phone, customerName, items, orderType, address, paymentMethod } = req.body;

  if (!phone || !items || items.length === 0 || !orderType) {
    return res.status(400).json({ success: false, message: 'phone, items and orderType are required' });
  }

  let customer = await Customer.findOne({ phone });
  if (!customer) customer = await Customer.create({ phone, name: customerName });

  const calc = calculateOrderTotal(items, orderType, 0);
  const orderId = await generateOrderId();

  const order = await Order.create({
    orderId,
    customerId: customer._id,
    customerName: customerName || customer.name,
    phone,
    items,
    orderType,
    address: orderType === 'DELIVERY' ? address : null,
    ...calc,
    paymentMethod: paymentMethod || 'COD',
    status: 'PENDING_CONFIRMATION',
  });

  res.status(201).json({ success: true, data: order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const order = await Order.findOneAndUpdate({ orderId: req.params.id }, { status }, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Notify the customer on WhatsApp of meaningful status changes
  const customerFacingStatuses = {
    CONFIRMED: `✅ Your order ${order.orderId} has been confirmed!`,
    PREPARING: `👨‍🍳 Your order ${order.orderId} is now being prepared.`,
    READY: `🎉 Your order ${order.orderId} is ready!`,
    OUT_FOR_DELIVERY: `🛵 Your order ${order.orderId} is out for delivery.`,
    DELIVERED: `✅ Your order ${order.orderId} has been delivered. Enjoy your meal!`,
    CANCELLED: `❌ Your order ${order.orderId} has been cancelled. Contact us if this is unexpected.`,
  };
  if (customerFacingStatuses[status]) {
    await whatsapp.sendTextMessage(order.phone, customerFacingStatuses[status]).catch((e) => {
      console.error('Failed to notify customer of status change:', e.message);
    });
  }

  res.json({ success: true, data: order });
});

module.exports = { listOrders, getOrder, createOrderManual, updateOrderStatus };
