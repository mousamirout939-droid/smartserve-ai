const MenuItem = require('../models/MenuItem');
const Faq = require('../models/Faq');
const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const generateOrderId = require('../utils/generateOrderId');
const { calculateOrderTotal } = require('./orderCalc');

// ---------------------------------------------------------------------------
// TOOL 1: get_menu
// ---------------------------------------------------------------------------
async function getMenu({ category } = {}) {
  const filter = { available: true };
  if (category) filter.category = new RegExp(category, 'i');

  const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
  return items.map(formatMenuItem);
}

// ---------------------------------------------------------------------------
// TOOL 2: search_menu
// ---------------------------------------------------------------------------
async function searchMenu({ query }) {
  if (!query || !query.trim()) return [];

  const regex = new RegExp(query.trim(), 'i');
  const items = await MenuItem.find({
    available: true,
    $or: [{ name: regex }, { description: regex }, { category: regex }, { tags: regex }],
  }).lean();

  return items.map(formatMenuItem);
}

// ---------------------------------------------------------------------------
// TOOL 3: get_item_details
// ---------------------------------------------------------------------------
async function getItemDetails({ item_id, item_name }) {
  let item = null;
  if (item_id) {
    item = await MenuItem.findOne({
      $or: [{ itemCode: item_id }, { _id: isValidObjectId(item_id) ? item_id : null }],
    }).lean();
  }
  if (!item && item_name) {
    item = await MenuItem.findOne({ name: new RegExp(`^${escapeRegex(item_name)}$`, 'i') }).lean();
  }
  if (!item) return { found: false, message: 'Item not found in menu.' };

  return { found: true, ...formatMenuItem(item), customizationOptions: item.customizationOptions || [] };
}

// ---------------------------------------------------------------------------
// TOOL 4: get_faq
// ---------------------------------------------------------------------------
async function getFaq({ question, category }) {
  const filter = {};
  if (category) filter.category = new RegExp(category, 'i');

  let results = [];
  if (question) {
    // Pass 1: exact-ish regex match on the question field.
    results = await Faq.find({
      ...filter,
      question: new RegExp(escapeRegex(question), 'i'),
    })
      .limit(3)
      .lean();

    // Pass 2: MongoDB text index search. Note $text can never appear inside an
    // $or clause (Mongo rejects that query), so it must run as its own query.
    if (results.length === 0) {
      results = await Faq.find({ ...filter, $text: { $search: question } })
        .limit(3)
        .lean()
        .catch(() => []);
    }

    // Pass 3: loose keyword regex fallback if the above found nothing.
    if (results.length === 0) {
      const keywords = question.split(/\s+/).filter((w) => w.length > 3);
      if (keywords.length) {
        const orClauses = keywords.map((k) => ({ question: new RegExp(escapeRegex(k), 'i') }));
        results = await Faq.find({ ...filter, $or: orClauses }).limit(3).lean();
      }
    }
  } else {
    results = await Faq.find(filter).limit(10).lean();
  }

  if (results.length === 0) {
    return { found: false, message: 'No matching FAQ found. Tell the customer this information is not available yet.' };
  }
  return { found: true, results: results.map((f) => ({ question: f.question, answer: f.answer, category: f.category })) };
}

// ---------------------------------------------------------------------------
// TOOL 5: get_menu_images
// ---------------------------------------------------------------------------
async function getMenuImages({ item_ids, item_names }) {
  const filter = { available: true, $or: [] };
  if (item_ids && item_ids.length) filter.$or.push({ itemCode: { $in: item_ids } });
  if (item_names && item_names.length) {
    filter.$or.push({ name: { $in: item_names.map((n) => new RegExp(`^${escapeRegex(n)}$`, 'i')) } });
  }
  if (filter.$or.length === 0) return [];

  const items = await MenuItem.find(filter).lean();
  return items
    .filter((i) => !!i.imageUrl)
    .map((i) => ({ itemCode: i.itemCode, name: i.name, price: i.price, imageUrl: i.imageUrl, description: i.description }));
}

// ---------------------------------------------------------------------------
// TOOL 6: calculate_order_total
// ---------------------------------------------------------------------------
async function calculateOrderTotalTool({ items, order_type, discount }) {
  // Re-price every item server-side from the DB. Never trust prices passed by the model.
  const priced = [];
  for (const line of items) {
    const menuItem = await MenuItem.findOne({
      $or: [{ itemCode: line.item_id }, { name: new RegExp(`^${escapeRegex(line.item_name || '')}$`, 'i') }],
      available: true,
    }).lean();

    if (!menuItem) {
      return { error: `Item not found or unavailable: ${line.item_name || line.item_id}` };
    }
    priced.push({
      itemName: menuItem.name,
      menuItemId: menuItem._id,
      unitPrice: menuItem.price,
      quantity: line.quantity,
    });
  }

  const calc = calculateOrderTotal(priced, order_type, discount || 0);
  return {
    items: priced.map((p) => ({
      name: p.itemName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      lineTotal: Math.round(p.unitPrice * p.quantity * 100) / 100,
    })),
    ...calc,
  };
}

// ---------------------------------------------------------------------------
// TOOL 7: create_order  (status = PENDING_CONFIRMATION, NOT final)
// ---------------------------------------------------------------------------
async function createOrder({ customer_id, customer_name, phone, items, order_type, address, payment_method }) {
  if (!items || items.length === 0) {
    return { error: 'Cannot create an order with an empty cart.' };
  }

  const priced = [];
  for (const line of items) {
    const menuItem = await MenuItem.findOne({
      $or: [{ itemCode: line.item_id }, { name: new RegExp(`^${escapeRegex(line.item_name || '')}$`, 'i') }],
      available: true,
    }).lean();
    if (!menuItem) {
      return { error: `Item not found or unavailable: ${line.item_name || line.item_id}` };
    }
    priced.push({
      menuItemId: menuItem._id,
      itemName: menuItem.name,
      quantity: line.quantity,
      unitPrice: menuItem.price,
      subtotal: Math.round(menuItem.price * line.quantity * 100) / 100,
    });
  }

  const calc = calculateOrderTotal(priced, order_type, 0);
  const orderId = await generateOrderId();

  const order = await Order.create({
    orderId,
    customerId: customer_id,
    customerName: customer_name || null,
    phone,
    items: priced,
    orderType: order_type,
    address: order_type === 'DELIVERY' ? address : null,
    subtotal: calc.subtotal,
    deliveryFee: calc.deliveryFee,
    tax: calc.tax,
    discount: calc.discount,
    total: calc.total,
    paymentMethod: payment_method || (order_type === 'PICKUP' ? 'PAY_ON_PICKUP' : 'COD'),
    status: 'PENDING_CONFIRMATION',
  });

  await Conversation.findOneAndUpdate({ phone }, { currentOrderId: order.orderId });

  return { success: true, order: serializeOrder(order) };
}

// ---------------------------------------------------------------------------
// TOOL 8: get_order_status
// ---------------------------------------------------------------------------
async function getOrderStatus({ order_id, phone }) {
  const filter = order_id ? { orderId: order_id } : { phone };
  const order = await Order.findOne(filter).sort({ createdAt: -1 }).lean();
  if (!order) return { found: false, message: 'No order found.' };
  return { found: true, order: serializeOrder(order) };
}

// ---------------------------------------------------------------------------
// TOOL 9: confirm_order  (the ONLY path that flips PENDING_CONFIRMATION -> CONFIRMED)
// ---------------------------------------------------------------------------
async function confirmOrder({ order_id, whatsapp_message_id }) {
  const order = await Order.findOne({ orderId: order_id });
  if (!order) return { success: false, error: 'Order not found.' };

  if (order.status === 'CONFIRMED') {
    // idempotent - protects against duplicate confirm tool calls / duplicate webhooks
    return { success: true, alreadyConfirmed: true, order: serializeOrder(order) };
  }
  if (order.status !== 'PENDING_CONFIRMATION') {
    return { success: false, error: `Order is in status ${order.status} and cannot be confirmed again.` };
  }

  order.status = 'CONFIRMED';
  order.sourceMessageId = whatsapp_message_id || order.sourceMessageId;
  await order.save();

  // clear the cart now that it has become a real confirmed order
  await Conversation.findOneAndUpdate(
    { phone: order.phone },
    { currentCart: [], pendingOrderType: null, pendingAddress: null, currentOrderId: null }
  );

  return { success: true, order: serializeOrder(order) };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function formatMenuItem(i) {
  return {
    id: i.itemCode,
    name: i.name,
    category: i.category,
    price: i.price,
    available: i.available,
    description: i.description,
    image_url: i.imageUrl,
    tags: i.tags || [],
  };
}

function serializeOrder(order) {
  const o = order.toObject ? order.toObject() : order;
  return {
    orderId: o.orderId,
    status: o.status,
    items: o.items.map((it) => ({ name: it.itemName, quantity: it.quantity, unitPrice: it.unitPrice, subtotal: it.subtotal })),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    tax: o.tax,
    discount: o.discount,
    total: o.total,
    orderType: o.orderType,
    address: o.address,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    estimatedMinutes: o.estimatedMinutes,
  };
}

function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

module.exports = {
  getMenu,
  searchMenu,
  getItemDetails,
  getFaq,
  getMenuImages,
  calculateOrderTotalTool,
  createOrder,
  getOrderStatus,
  confirmOrder,
  serializeOrder,
};
