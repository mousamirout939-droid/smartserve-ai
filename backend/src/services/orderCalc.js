// The ONLY place order math happens. The AI agent must call the calculate_order_total
// tool (which calls this) rather than computing totals itself, so numbers always
// match what actually gets saved to the database.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * @param {Array<{unitPrice:number, quantity:number}>} items
 * @param {string} orderType 'DELIVERY' | 'PICKUP'
 * @param {number} discount optional flat discount
 */
function calculateOrderTotal(items, orderType, discount = 0) {
  const subtotal = round2(items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0));

  const deliveryFee = orderType === 'DELIVERY' ? Number(process.env.DELIVERY_FEE || 40) : 0;

  const taxRate = Number(process.env.TAX_RATE_PERCENT || 5) / 100;
  const tax = round2(subtotal * taxRate);

  const total = round2(subtotal + deliveryFee + tax - discount);

  return {
    subtotal,
    deliveryFee,
    tax,
    discount: round2(discount),
    total: Math.max(total, 0),
  };
}

module.exports = { calculateOrderTotal, round2 };
