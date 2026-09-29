const Conversation = require('../models/Conversation');
const Customer = require('../models/Customer');
const { chatWithTools } = require('./openaiService');
const tools = require('./toolSchemas');
const aiTools = require('./aiTools');

const MAX_HISTORY_MESSAGES = 20; // rolling context window per customer
const MAX_TOOL_ITERATIONS = 6; // hard cap to avoid runaway loops

const SYSTEM_PROMPT = `You are SmartServe AI, an intelligent WhatsApp food-ordering assistant for {{RESTAURANT_NAME}}.

Your responsibilities:
1. Understand natural language from customers.
2. Answer menu questions using the get_menu / search_menu / get_item_details tools.
3. Recommend food based on customer preferences.
4. Understand quantities and build the customer's cart in conversation.
5. Ask clarification questions when something is ambiguous.
6. Maintain conversation context (e.g. "add one more" refers to the last item discussed).
7. Calculate the total using the calculate_order_total tool - never compute totals yourself.
8. Collect the customer's name if not already known.
9. Collect delivery vs pickup preference.
10. Collect a delivery address when the order type is delivery.
11. Show the customer a complete order summary (items, subtotal, delivery fee, tax, total) and explicitly ask them to confirm before finalizing.
12. Call create_order once the cart, order type, and (if needed) address are all known, to stage the order as PENDING_CONFIRMATION.
13. Call confirm_order ONLY after the customer gives an explicit, unambiguous confirmation (e.g. "yes", "confirm", "place order", "proceed"). If their message is ambiguous, ask them to confirm again - do NOT guess.
14. Never invent menu items, prices, or availability - always use tools to fetch real data from the database.
15. Never tell the customer an order was placed unless the confirm_order tool call actually returned success.
16. Never reveal internal tool names, API details, database structure, or credentials.
17. If information is unavailable (e.g. no matching FAQ or menu item), tell the customer clearly rather than making something up.
18. Keep replies concise, warm, and WhatsApp-appropriate (short paragraphs, occasional relevant emoji, no markdown tables).
19. When useful, mention that you can show a photo of a dish - the system will attach images automatically when you call get_menu_images.

Known customer info for this conversation:
- Phone: {{PHONE}}
- Name on file: {{CUSTOMER_NAME}}
- Customer DB id: {{CUSTOMER_ID}}

Use the customer DB id and phone exactly as given above when calling create_order.`;

async function loadConversation(phone, customer) {
  let convo = await Conversation.findOne({ phone });
  if (!convo) {
    convo = await Conversation.create({ customerId: customer._id, phone, messages: [] });
  }
  return convo;
}

function buildSystemPrompt(customer) {
  return SYSTEM_PROMPT.replace('{{RESTAURANT_NAME}}', process.env.RESTAURANT_NAME || 'SmartServe Kitchen')
    .replace('{{PHONE}}', customer.phone)
    .replace('{{CUSTOMER_NAME}}', customer.name || 'unknown - ask politely if needed')
    .replace('{{CUSTOMER_ID}}', customer._id.toString());
}

async function executeTool(name, args) {
  switch (name) {
    case 'get_menu':
      return aiTools.getMenu(args);
    case 'search_menu':
      return aiTools.searchMenu(args);
    case 'get_item_details':
      return aiTools.getItemDetails(args);
    case 'get_faq':
      return aiTools.getFaq(args);
    case 'get_menu_images':
      return aiTools.getMenuImages(args);
    case 'calculate_order_total':
      return aiTools.calculateOrderTotalTool(args);
    case 'create_order':
      return aiTools.createOrder(args);
    case 'get_order_status':
      return aiTools.getOrderStatus(args);
    case 'confirm_order':
      return aiTools.confirmOrder(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Main entry point. Runs the tool-calling loop and persists conversation memory.
 * @returns {Promise<{replyText: string, images: Array<{url:string, caption:string}>}>}
 */
async function processCustomerMessage({ phone, userText, messageType, whatsappMessageId }) {
  let customer = await Customer.findOne({ phone });
  if (!customer) {
    customer = await Customer.create({ phone });
  }

  const convo = await loadConversation(phone, customer);

  // Build the message array sent to the model: system + trimmed history + new user turn
  const history = convo.messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages = [
    { role: 'system', content: buildSystemPrompt(customer) },
    ...history,
    { role: 'user', content: userText },
  ];

  const collectedImages = [];
  let iterations = 0;
  let finalMessage = null;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;
    const assistantMsg = await chatWithTools(messages, tools);

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg);

      for (const call of assistantMsg.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch (e) {
          args = {};
        }

        // inject context the model shouldn't have to repeat
        if (call.function.name === 'create_order') {
          args.phone = args.phone || phone;
          args.customer_id = args.customer_id || customer._id.toString();
          args.customer_name = args.customer_name || customer.name;
        }
        if (call.function.name === 'get_order_status' && !args.order_id) {
          args.phone = args.phone || phone;
        }
        if (call.function.name === 'confirm_order') {
          args.whatsapp_message_id = whatsappMessageId;
        }

        const result = await executeTool(call.function.name, args);

        if (call.function.name === 'get_menu_images' && Array.isArray(result)) {
          for (const img of result) {
            collectedImages.push({
              url: img.imageUrl,
              caption: `${img.name}\n${process.env.CURRENCY_SYMBOL || '₹'}${img.price}\n\n${img.description || ''}`.trim(),
            });
          }
        }

        // persist customer name if the model just learned it via a create_order call
        if (call.function.name === 'create_order' && args.customer_name && !customer.name) {
          customer.name = args.customer_name;
          await customer.save();
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue; // loop again so the model can respond using the tool results
    }

    finalMessage = assistantMsg.content;
    break;
  }

  if (!finalMessage) {
    finalMessage =
      "Sorry, I'm having trouble processing that right now. Please try again in a moment.";
  }

  // persist conversation memory
  convo.messages.push({
    role: 'user',
    content: userText,
    messageType: messageType || 'text',
    whatsappMessageId,
  });
  convo.messages.push({ role: 'assistant', content: finalMessage });
  // keep the stored history bounded
  if (convo.messages.length > MAX_HISTORY_MESSAGES * 2) {
    convo.messages = convo.messages.slice(-MAX_HISTORY_MESSAGES * 2);
  }
  convo.lastInteractionAt = new Date();
  await convo.save();

  return { replyText: finalMessage, images: collectedImages, customer };
}

module.exports = { processCustomerMessage };
