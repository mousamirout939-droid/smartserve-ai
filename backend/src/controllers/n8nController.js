const asyncHandler = require('../utils/asyncHandler');
const ProcessedMessage = require('../models/ProcessedMessage');
const agent = require('../services/aiAgentService');

// Shared-secret check so this internal endpoint can't be hit by randoms.
// n8n sends it as header 'x-n8n-secret'.
function checkSecret(req, res) {
  const expected = process.env.N8N_SHARED_SECRET;
  if (!expected) return true; // not configured -> open (fine for local dev only)
  return req.headers['x-n8n-secret'] === expected;
}

// POST /api/n8n/process-message
// Body: { phone, text, messageType, whatsappMessageId }
// Used when message routing/transcription happens INSIDE the n8n workflow
// (per the reference architecture) and n8n calls the backend only for
// deduplication + the AI agent + database work, then sends the WhatsApp
// reply itself using its own HTTP Request node.
const processMessage = asyncHandler(async (req, res) => {
  if (!checkSecret(req, res)) {
    return res.status(401).json({ success: false, message: 'Invalid n8n shared secret' });
  }

  const { phone, text, messageType, whatsappMessageId } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ success: false, message: 'phone and text are required' });
  }

  if (whatsappMessageId) {
    try {
      await ProcessedMessage.create({ whatsappMessageId, phone });
    } catch (err) {
      if (err.code === 11000) {
        return res.json({ success: true, duplicate: true, replyText: null, images: [] });
      }
      throw err;
    }
  }

  const result = await agent.processCustomerMessage({
    phone,
    userText: text,
    messageType: messageType || 'text',
    whatsappMessageId,
  });

  res.json({ success: true, duplicate: false, replyText: result.replyText, images: result.images });
});

module.exports = { processMessage };
