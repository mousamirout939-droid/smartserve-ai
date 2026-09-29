// JSON-schema tool definitions passed to OpenAI's function-calling API.
// Keep names in sync with the switch statement in aiAgentService.js

module.exports = [
  {
    type: 'function',
    function: {
      name: 'get_menu',
      description: 'Get all currently available menu items, optionally filtered by category.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional category filter, e.g. "Burger", "Beverages"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_menu',
      description: 'Search the menu by keyword, e.g. "spicy", "vegetarian", "chicken".',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_item_details',
      description: 'Get full details (ingredients, customization options, availability) for one menu item.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'Menu item code, e.g. M001' },
          item_name: { type: 'string', description: 'Menu item name if id is unknown' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_faq',
      description:
        'Look up restaurant FAQ information such as opening hours, delivery areas, payment methods, refund policy, pickup instructions.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          category: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu_images',
      description: 'Get image URLs for one or more menu items so they can be sent to the customer on WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          item_ids: { type: 'array', items: { type: 'string' } },
          item_names: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_order_total',
      description:
        'Calculate the exact subtotal, delivery fee, tax and total for a set of cart items. ALWAYS call this before telling the customer a total - never compute totals yourself.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_id: { type: 'string' },
                item_name: { type: 'string' },
                quantity: { type: 'number' },
              },
              required: ['quantity'],
            },
          },
          order_type: { type: 'string', enum: ['DELIVERY', 'PICKUP'] },
          discount: { type: 'number' },
        },
        required: ['items', 'order_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description:
        'Create a new order in status PENDING_CONFIRMATION. Call this only once you have the full cart, order type, address (if delivery) and the customer has seen the final total - but BEFORE the customer has said the final "yes". This stages the order; confirm_order is what finalizes it.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          customer_name: { type: 'string' },
          phone: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_id: { type: 'string' },
                item_name: { type: 'string' },
                quantity: { type: 'number' },
              },
              required: ['quantity'],
            },
          },
          order_type: { type: 'string', enum: ['DELIVERY', 'PICKUP'] },
          address: { type: 'string' },
          payment_method: { type: 'string', enum: ['COD', 'PAY_ON_PICKUP', 'RAZORPAY'] },
        },
        required: ['customer_id', 'phone', 'items', 'order_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: "Get the status and details of a customer's order.",
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string' },
          phone: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_order',
      description:
        'Finalize an order, changing it from PENDING_CONFIRMATION to CONFIRMED. Call this ONLY after the customer has given an explicit, unambiguous confirmation such as "yes", "confirm", "place order", "proceed". Never call this speculatively.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string' },
        },
        required: ['order_id'],
      },
    },
  },
];
