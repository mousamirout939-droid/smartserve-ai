const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, default: '' },
    messageType: { type: String, default: 'text' }, // text, audio, image, location, interactive
    whatsappMessageId: { type: String, default: null },
    toolCalls: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    itemName: String,
    quantity: Number,
    unitPrice: Number,
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    phone: { type: String, required: true, unique: true, index: true },

    // rolling window of messages sent to the LLM as context (trimmed to last N)
    messages: { type: [MessageSchema], default: [] },

    currentCart: { type: [CartItemSchema], default: [] },
    pendingOrderType: { type: String, enum: ['DELIVERY', 'PICKUP', null], default: null },
    pendingAddress: { type: String, default: null },
    currentOrderId: { type: String, default: null }, // most recent PENDING_CONFIRMATION order id

    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastInteractionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
