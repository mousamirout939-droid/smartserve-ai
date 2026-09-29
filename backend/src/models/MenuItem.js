const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true }, // e.g. M001
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    ingredients: [{ type: String }],
    tags: [{ type: String }], // e.g. spicy, vegetarian, bestseller
    available: { type: Boolean, default: true },
    imageUrl: { type: String, default: '' },
    customizationOptions: [
      {
        name: String, // e.g. "Spice level"
        options: [String], // e.g. ["Mild","Medium","Hot"]
      },
    ],
  },
  { timestamps: true }
);

MenuItemSchema.index({ name: 'text', description: 'text', tags: 'text', category: 'text' });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
