const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general' }, // hours, delivery, payment, refund, pickup, general
  },
  { timestamps: true }
);

FaqSchema.index({ question: 'text', answer: 'text', category: 'text' });

module.exports = mongoose.model('Faq', FaqSchema);
