const mongoose = require('mongoose');

// Every inbound WhatsApp message id is recorded here BEFORE processing.
// If a webhook is retried (Meta re-delivers on timeout, or duplicate delivery),
// this lets us short-circuit and guarantee we never process the same message twice
// -> never create a duplicate order.
const ProcessedMessageSchema = new mongoose.Schema(
  {
    whatsappMessageId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProcessedMessage', ProcessedMessageSchema);
