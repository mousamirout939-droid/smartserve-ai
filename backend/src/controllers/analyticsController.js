const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const getDashboardSummary = asyncHandler(async (req, res) => {
  const today = startOfToday();

  const [todayOrders, todayRevenueAgg, pending, confirmed, cancelled, activeCustomers] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, sum: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ status: 'PENDING_CONFIRMATION' }),
    Order.countDocuments({ status: 'CONFIRMED' }),
    Order.countDocuments({ status: 'CANCELLED', createdAt: { $gte: today } }),
    Customer.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
  ]);

  const popularItems = await Order.aggregate([
    { $match: { status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.itemName', qty: { $sum: '$items.quantity' } } },
    { $sort: { qty: -1 } },
    { $limit: 5 },
  ]);

  res.json({
    success: true,
    data: {
      todayOrders,
      todayRevenue: todayRevenueAgg[0] ? todayRevenueAgg[0].sum : 0,
      pendingOrders: pending,
      confirmedOrders: confirmed,
      cancelledOrdersToday: cancelled,
      activeCustomers,
      popularItems: popularItems.map((p) => ({ name: p._id, quantity: p.qty })),
    },
  });
});

const getAiAnalytics = asyncHandler(async (req, res) => {
  const [mostOrdered, avgOrderAgg, repeatCustomersAgg, popularCategoriesAgg, hourlyAgg] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemName', qty: { $sum: '$items.quantity' } } },
      { $sort: { qty: -1 } },
      { $limit: 1 },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]),
    Order.aggregate([
      { $group: { _id: '$customerId', orders: { $sum: 1 } } },
      { $match: { orders: { $gt: 1 } } },
      { $count: 'repeatCustomers' },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemName', qty: { $sum: '$items.quantity' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Order.countDocuments({ status: 'CANCELLED' }),
  ]);

  const cancelledCount = await Order.countDocuments({ status: 'CANCELLED' });
  const totalOrders = await Order.countDocuments();

  const insights = [];
  if (mostOrdered[0] && totalOrders > 0) {
    const pct = Math.round((mostOrdered[0].qty / totalOrders) * 100);
    insights.push(`${mostOrdered[0]._id} is the most ordered item, appearing in roughly ${pct}% of order volume.`);
  }
  if (hourlyAgg[0]) {
    insights.push(`Peak ordering hour is around ${hourlyAgg[0]._id}:00.`);
  }

  res.json({
    success: true,
    data: {
      mostOrderedItem: mostOrdered[0] ? mostOrdered[0]._id : null,
      peakOrderingHour: hourlyAgg[0] ? hourlyAgg[0]._id : null,
      averageOrderValue: avgOrderAgg[0] ? Math.round(avgOrderAgg[0].avg * 100) / 100 : 0,
      repeatCustomers: repeatCustomersAgg[0] ? repeatCustomersAgg[0].repeatCustomers : 0,
      cancelledOrders: cancelledCount,
      popularCategories: popularCategoriesAgg.map((c) => ({ name: c._id, quantity: c.qty })),
      insights,
    },
  });
});

module.exports = { getDashboardSummary, getAiAnalytics };
