const asyncHandler = require('../utils/asyncHandler');
const Faq = require('../models/Faq');

const listFaqs = asyncHandler(async (req, res) => {
  const faqs = await Faq.find().sort({ category: 1 });
  res.json({ success: true, data: faqs });
});

const createFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.create(req.body);
  res.status(201).json({ success: true, data: faq });
});

const updateFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
  res.json({ success: true, data: faq });
});

const deleteFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.findByIdAndDelete(req.params.id);
  if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
  res.json({ success: true, message: 'FAQ deleted' });
});

module.exports = { listFaqs, createFaq, updateFaq, deleteFaq };
