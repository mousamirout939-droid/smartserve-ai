const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const listCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });

  // attach lightweight order stats
  const data = await Promise.all(
    customers.map(async (c) => {
      const orderCount = await Order.countDocuments({ customerId: c._id });
      const totalSpent = await Order.aggregate([
        { $match: { customerId: c._id, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, sum: { $sum: '$total' } } },
      ]);
      return {
        ...c.toObject(),
        orderCount,
        totalSpent: totalSpent[0] ? totalSpent[0].sum : 0,
      };
    })
  );

  res.json({ success: true, data });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

  const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { customer, orders } });
});

module.exports = { listCustomers, getCustomer };
