const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true }, // e.g. SS1024
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, default: null },
    phone: { type: String, required: true, index: true },

    items: { type: [OrderItemSchema], default: [] },

    orderType: { type: String, enum: ['DELIVERY', 'PICKUP'], required: true },
    address: { type: String, default: null },

    subtotal: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },

    paymentMethod: {
      type: String,
      enum: ['COD', 'PAY_ON_PICKUP', 'RAZORPAY'],
      default: 'COD',
    },
    paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'FAILED'], default: 'UNPAID' },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    status: {
      type: String,
      enum: [
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PENDING_CONFIRMATION',
    },

    estimatedMinutes: { type: Number, default: 40 },
    sourceMessageId: { type: String, default: null }, // WhatsApp message id that triggered confirm
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
