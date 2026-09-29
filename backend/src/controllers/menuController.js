const asyncHandler = require('../utils/asyncHandler');
const MenuItem = require('../models/MenuItem');

const listMenuItems = asyncHandler(async (req, res) => {
  const { category, available } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (available !== undefined) filter.available = available === 'true';

  const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
  res.json({ success: true, data: items });
});

const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
});

const createMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.create(req.body);
  res.status(201).json({ success: true, data: item });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, message: 'Item deleted' });
});

module.exports = { listMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem };
