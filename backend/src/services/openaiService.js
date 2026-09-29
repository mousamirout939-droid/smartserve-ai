const OpenAI = require('openai');
const fs = require('fs');

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Set it in backend/.env');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';

/**
 * Transcribes a downloaded audio file (ogg/opus from WhatsApp) to text using Whisper.
 * @param {string} filePath - local path to the audio file
 */
async function transcribeAudio(filePath) {
  const resp = await getClient().audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: TRANSCRIBE_MODEL,
  });
  return resp.text;
}

/**
 * Uses GPT-4o vision to describe an incoming image and infer customer intent
 * (e.g. "customer is asking about this dish", "this is a screenshot of an address").
 * @param {string} imageUrl - a URL the model can fetch, OR a data URL (base64)
 */
async function analyzeImage(imageUrl, promptHint) {
  const resp = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              promptHint ||
              'Describe what is in this image in one or two sentences, and infer what the customer likely wants (e.g. asking about a menu item, sharing a delivery address, asking for a recommendation similar to this photo).',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 300,
  });
  return resp.choices[0].message.content;
}

/**
 * Core function-calling chat completion used by the AI Agent.
 * @param {Array} messages - full message list (system + history + latest user turn)
 * @param {Array} tools - OpenAI tool schema array
 */
async function chatWithTools(messages, tools) {
  const resp = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.3,
  });
  return resp.choices[0].message;
}

module.exports = { transcribeAudio, analyzeImage, chatWithTools };
