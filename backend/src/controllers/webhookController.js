const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const ProcessedMessage = require('../models/ProcessedMessage');
const whatsapp = require('../services/whatsappService');
const openai = require('../services/openaiService');
const agent = require('../services/aiAgentService');

// GET /api/webhook/whatsapp  - Meta webhook verification handshake
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// POST /api/webhook/whatsapp - inbound events
const receiveWebhook = asyncHandler(async (req, res) => {
  // Always 200 immediately so Meta doesn't retry-storm us; do the real work async-safe.
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    if (!value) return;

    // Delivery/read status callbacks - not customer messages, ignore.
    if (value.statuses) return;

    const messages = value.messages;
    if (!messages || messages.length === 0) return;

    for (const message of messages) {
      await handleSingleMessage(message, value);
    }
  } catch (err) {
    console.error('Error processing WhatsApp webhook payload:', err);
  }
});

async function handleSingleMessage(message, value) {
  const from = message.from; // customer's WhatsApp number
  const whatsappMessageId = message.id;

  // ---- Deduplication: never process the same WhatsApp message twice ----
  try {
    await ProcessedMessage.create({ whatsappMessageId, phone: from });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`Duplicate message ${whatsappMessageId} ignored (already processed).`);
      return;
    }
    throw err;
  }

  await whatsapp.markMessageAsRead(whatsappMessageId).catch(() => {});

  let userText = null;
  let messageType = message.type;

  try {
    if (message.type === 'text') {
      userText = message.text.body;
    } else if (message.type === 'audio' || message.type === 'voice') {
      userText = await handleAudioMessage(message);
      messageType = 'audio';
    } else if (message.type === 'image') {
      userText = await handleImageMessage(message);
      messageType = 'image';
    } else if (message.type === 'location') {
      const loc = message.location;
      userText = `[Customer shared a location] latitude: ${loc.latitude}, longitude: ${loc.longitude}${
        loc.address ? `, address: ${loc.address}` : ''
      }`;
    } else if (message.type === 'interactive') {
      const interactive = message.interactive;
      if (interactive.type === 'button_reply') {
        userText = interactive.button_reply.title;
      } else if (interactive.type === 'list_reply') {
        userText = interactive.list_reply.title;
      }
    } else {
      // Unsupported type (stickers, contacts, etc.)
      await whatsapp.sendTextMessage(
        from,
        "I can't process that type of message yet. Could you send it as text or voice?"
      );
      return;
    }

    if (!userText || !userText.trim()) {
      await whatsapp.sendTextMessage(from, "Sorry, I couldn't understand that. Could you try again?");
      return;
    }

    const result = await agent.processCustomerMessage({
      phone: from,
      userText,
      messageType,
      whatsappMessageId,
    });

    await whatsapp.sendTextMessage(from, result.replyText);

    for (const img of result.images) {
      if (img.url) {
        await whatsapp.sendImageMessage(from, img.url, img.caption).catch((e) => {
          console.error('Failed sending menu image:', e.message);
        });
      }
    }
  } catch (err) {
    console.error(`Error handling message ${whatsappMessageId} from ${from}:`, err.message);
    const fallback =
      messageType === 'audio'
        ? "Sorry, I couldn't understand the voice message. Could you send it again or type your order?"
        : "Sorry, I'm having trouble processing that right now. Please try again.";
    await whatsapp.sendTextMessage(from, fallback).catch(() => {});
  }
}

async function handleAudioMessage(message) {
  const mediaId = message.audio ? message.audio.id : message.voice.id;
  const { filePath } = await whatsapp.downloadMedia(mediaId);
  try {
    const transcript = await openai.transcribeAudio(filePath);
    return transcript;
  } finally {
    fs.unlink(filePath, () => {});
  }
}

async function handleImageMessage(message) {
  const mediaId = message.image.id;
  const caption = message.image.caption || '';
  const { filePath, mimeType } = await whatsapp.downloadMedia(mediaId);
  try {
    const base64 = fs.readFileSync(filePath).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const description = await openai.analyzeImage(dataUrl);
    return caption
      ? `[Customer sent an image with caption: "${caption}"]. Image shows: ${description}`
      : `[Customer sent an image]. Image shows: ${description}`;
  } finally {
    fs.unlink(filePath, () => {});
  }
}

module.exports = { verifyWebhook, receiveWebhook };
