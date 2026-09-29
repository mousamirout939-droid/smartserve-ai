const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    email: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String, default: null },
    phone: { type: String, required: true, unique: true, index: true },
    addresses: [{ type: String }],
    defaultAddress: { type: String, default: null },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', CustomerSchema);
