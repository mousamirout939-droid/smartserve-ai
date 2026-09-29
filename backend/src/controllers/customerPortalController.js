const crypto = require('crypto');
const Razorpay = require('razorpay');
const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const generateOrderId = require('../utils/generateOrderId');
const { calculateOrderTotal } = require('../services/orderCalc');
const { publicCustomer } = require('./customerAuthController');

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Online payment is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

const me = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, data: publicCustomer(customer) });
});

const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customerId: req.customer.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: orders });
});

const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id, customerId: req.customer.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: order });
});

const createOrder = asyncHandler(async (req, res) => {
  const { items, orderType, address, paymentMethod } = req.body;
  if (!Array.isArray(items) || items.length === 0 || !['DELIVERY', 'PICKUP'].includes(orderType)) {
    return res.status(400).json({ success: false, message: 'Items and a valid order type are required' });
  }
  if (orderType === 'DELIVERY' && !address?.trim()) {
    return res.status(400).json({ success: false, message: 'A delivery address is required' });
  }
  if (!['COD', 'PAY_ON_PICKUP', 'RAZORPAY'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  const requestedIds = items.map((item) => item.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: requestedIds }, available: true });
  const menuById = new Map(menuItems.map((item) => [String(item._id), item]));
  const orderItems = items.map((item) => {
    const menuItem = menuById.get(String(item.menuItemId));
    const quantity = Number(item.quantity);
    if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null;
    return {
      menuItemId: menuItem._id,
      itemName: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
      subtotal: menuItem.price * quantity,
    };
  });
  if (orderItems.some((item) => !item)) {
    return res.status(400).json({ success: false, message: 'One or more selected items are unavailable or invalid' });
  }

  const customer = await Customer.findById(req.customer.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  const cleanAddress = address?.trim() || null;
  const calc = calculateOrderTotal(orderItems, orderType, 0);
  const order = await Order.create({
    orderId: await generateOrderId(),
    customerId: customer._id,
    customerName: customer.name,
    phone: customer.phone,
    items: orderItems,
    orderType,
    address: cleanAddress,
    ...calc,
    paymentMethod,
    estimatedMinutes: orderType === 'DELIVERY' ? 45 : 30,
    status: 'PENDING_CONFIRMATION',
  });

  if (cleanAddress && cleanAddress !== customer.defaultAddress) {
    customer.defaultAddress = cleanAddress;
    if (!customer.addresses.includes(cleanAddress)) customer.addresses.push(cleanAddress);
    await customer.save();
  }
  res.status(201).json({ success: true, data: order });
});

const createPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id, customerId: req.customer.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.paymentMethod !== 'RAZORPAY') return res.status(400).json({ success: false, message: 'This order does not use online payment' });
  if (order.paymentStatus === 'PAID') return res.status(400).json({ success: false, message: 'Order is already paid' });

  const paymentOrder = await getRazorpay().orders.create({
    amount: Math.round(order.total * 100),
    currency: process.env.CURRENCY_CODE || 'INR',
    receipt: order.orderId,
    notes: { orderId: order.orderId },
  });
  order.razorpayOrderId = paymentOrder.id;
  await order.save();
  res.json({
    success: true,
    data: { key: process.env.RAZORPAY_KEY_ID, razorpayOrderId: paymentOrder.id, amount: paymentOrder.amount, currency: paymentOrder.currency, order },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification fields are required' });
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) {
    return res.status(400).json({ success: false, message: 'Payment signature could not be verified' });
  }

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, customerId: req.customer.id });
  if (!order) return res.status(404).json({ success: false, message: 'Payment order not found' });
  order.paymentStatus = 'PAID';
  order.razorpayPaymentId = razorpay_payment_id;
  order.status = 'CONFIRMED';
  await order.save();
  res.json({ success: true, data: order });
});

module.exports = { me, listMyOrders, getMyOrder, createOrder, createPayment, verifyPayment };
