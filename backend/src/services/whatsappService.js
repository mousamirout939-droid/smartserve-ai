const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

function graphUrl(pathSegment) {
  return `https://graph.facebook.com/${API_VERSION}/${pathSegment}`;
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
}

function phoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured');
  return id;
}

async function sendWithRetry(payload, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await axios.post(graphUrl(`${phoneNumberId()}/messages`), payload, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err.response && err.response.status;
      // Retry only on transient failures (5xx / network), not on 4xx (bad request)
      if (status && status < 500) break;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  console.error('WhatsApp send failed:', lastErr.response ? lastErr.response.data : lastErr.message);
  throw lastErr;
}

async function sendTextMessage(to, body) {
  return sendWithRetry({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body, preview_url: false },
  });
}

async function sendImageMessage(to, imageUrl, caption) {
  return sendWithRetry({
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link: imageUrl, caption },
  });
}

/**
 * rows: [{ id, title, description }]
 */
async function sendListMessage(to, headerText, bodyText, buttonText, rows) {
  return sendWithRetry({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        button: buttonText,
        sections: [{ title: 'Options', rows: rows.slice(0, 10) }],
      },
    },
  });
}

/**
 * buttons: [{ id, title }] (max 3)
 */
async function sendButtonMessage(to, bodyText, buttons) {
  return sendWithRetry({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

async function markMessageAsRead(messageId) {
  try {
    await axios.post(
      graphUrl(`${phoneNumberId()}/messages`),
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: authHeaders() }
    );
  } catch (err) {
    // non-critical
    console.warn('Failed to mark message as read:', err.message);
  }
}

/**
 * Downloads WhatsApp media (audio/image) by media id and saves to a local tmp file.
 * Returns { filePath, mimeType }
 */
async function downloadMedia(mediaId) {
  const metaResp = await axios.get(graphUrl(mediaId), { headers: authHeaders() });
  const { url, mime_type: mimeType } = metaResp.data;

  const fileResp = await axios.get(url, {
    headers: authHeaders(),
    responseType: 'arraybuffer',
  });

  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.split('/')[1] || 'bin';
  const filePath = path.join(os.tmpdir(), `wa_media_${mediaId}.${ext}`);
  fs.writeFileSync(filePath, fileResp.data);

  return { filePath, mimeType };
}

module.exports = {
  sendTextMessage,
  sendImageMessage,
  sendListMessage,
  sendButtonMessage,
  markMessageAsRead,
  downloadMedia,
};
