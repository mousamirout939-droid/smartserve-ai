const asyncHandler = require('../utils/asyncHandler');
const Conversation = require('../models/Conversation');

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find()
    .sort({ lastInteractionAt: -1 })
    .limit(100)
    .select('phone customerId currentCart lastInteractionAt currentOrderId messages');

  const data = conversations.map((c) => ({
    phone: c.phone,
    customerId: c.customerId,
    lastInteractionAt: c.lastInteractionAt,
    currentOrderId: c.currentOrderId,
    cartItemCount: c.currentCart.length,
    lastMessage: c.messages.length ? c.messages[c.messages.length - 1] : null,
  }));

  res.json({ success: true, data });
});

const getConversationByPhone = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ phone: req.params.phone });
  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ success: true, data: conversation });
});

module.exports = { listConversations, getConversationByPhone };
