# API Reference

Base URL: `http://localhost:5000/api` (local) or your deployed backend + `/api`.

Admin-protected endpoints require header: `Authorization: Bearer <token>` (obtained from `POST /auth/login`).

---

## Webhook

### `GET /webhook/whatsapp`
Meta's verification handshake. Query params: `hub.mode`, `hub.verify_token`, `hub.challenge`. Returns the challenge as plain text if the token matches `WHATSAPP_VERIFY_TOKEN`, else `403`.

### `POST /webhook/whatsapp`
Receives inbound WhatsApp events. No auth (Meta signs requests; add signature verification via `X-Hub-Signature-256` for production hardening if desired). Always responds `200` immediately, then processes asynchronously.

---

## n8n integration

### `POST /n8n/process-message`
Used by the n8n workflow after it has already done message-type detection/transcription/vision. Header: `x-n8n-secret: <N8N_SHARED_SECRET>`.

Body:
```json
{ "phone": "919876543210", "text": "Show me burgers", "messageType": "text", "whatsappMessageId": "wamid.XXXX" }
```

Response:
```json
{ "success": true, "duplicate": false, "replyText": "...", "images": [{ "url": "...", "caption": "..." }] }
```

---

## Auth

### `POST /auth/login`
Body: `{ "email": "...", "password": "..." }` → `{ token, admin }`

### `GET /auth/me` *(protected)*
Returns the decoded admin token payload.

---

## Menu

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/menu` | public | List menu items. Query: `category`, `available` |
| GET | `/menu/:id` | public | Get one item |
| POST | `/menu` | admin | Create item |
| PUT | `/menu/:id` | admin | Update item |
| DELETE | `/menu/:id` | admin | Delete item |

Menu item body shape:
```json
{
  "itemCode": "M011",
  "name": "Cheese Fries",
  "category": "Sides",
  "description": "Fries topped with melted cheese.",
  "price": 129,
  "ingredients": ["Potato", "Cheese"],
  "tags": ["vegetarian"],
  "available": true,
  "imageUrl": "https://...",
  "customizationOptions": [{ "name": "Cheese type", "options": ["Cheddar", "Mozzarella"] }]
}
```

---

## Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders` | admin | List orders. Query: `status`, `phone`, `from`, `to`, `limit` |
| GET | `/orders/:id` | admin | Get one order (by `orderId` or Mongo `_id`) |
| POST | `/orders` | admin | Manually create an order (e.g. phone orders taken by staff) |
| PUT | `/orders/:id/status` | admin | Update status. Body: `{ "status": "PREPARING" }`. Sends a WhatsApp notification to the customer for meaningful status changes. |

Valid statuses: `PENDING_CONFIRMATION`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.

---

## Customers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/customers` | admin | List customers with order count + total spent |
| GET | `/customers/:id` | admin | Get one customer + their orders |

---

## FAQs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/faqs` | public | List FAQs |
| POST | `/faqs` | admin | Create FAQ |
| PUT | `/faqs/:id` | admin | Update FAQ |
| DELETE | `/faqs/:id` | admin | Delete FAQ |

---

## Conversations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | admin | List recent conversations (summary) |
| GET | `/conversations/:phone` | admin | Full message history + cart state for one phone number |

---

## Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/dashboard` | admin | Today's orders/revenue, pending/confirmed counts, popular items |
| GET | `/analytics/ai-insights` | admin | Most ordered item, peak hour, avg order value, repeat customers, generated insight sentences |

---

## Error format

All errors: `{ "success": false, "message": "..." }` with an appropriate HTTP status code. `500` responses never leak internal details.
