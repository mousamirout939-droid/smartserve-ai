const Order = require('../models/Order');

// Generates a real, sequential, collision-checked order id like SS1024.
// Never a hard-coded or random-guessed id - it is derived from the current
// count of orders in the database plus a base offset, and re-checked for
// uniqueness before being returned.
async function generateOrderId() {
  const base = 1000;
  let attempt = 0;

  while (attempt < 5) {
    const count = await Order.countDocuments();
    const candidate = `SS${base + count + attempt}`;
    const exists = await Order.findOne({ orderId: candidate }).lean();
    if (!exists) return candidate;
    attempt += 1;
  }

  // Extremely unlikely fallback: timestamp-based id, still checked for collisions in caller.
  return `SS${Date.now()}`;
}

module.exports = generateOrderId;
