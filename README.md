# SmartServe AI — WhatsApp Food Ordering Agent

A real, working WhatsApp ordering assistant: customers order by text, voice, or image on WhatsApp; an AI agent (OpenAI function calling) understands them, reads your live menu from MongoDB, builds a cart, calculates exact totals server-side, and only creates/confirms orders after explicit customer confirmation. An admin dashboard manages the menu, orders, customers, FAQs, and shows AI analytics.

**Nothing here is a mock.** Every tool the AI can call hits a real MongoDB-backed service. Prices are always re-fetched from the database, never invented by the model. Orders only move from `PENDING_CONFIRMATION` to `CONFIRMED` after an explicit "yes" and a real database write.

---

## 1. Architecture

```
Customer (WhatsApp)
      |
WhatsApp Cloud API
      |
Webhook  ->  Message Type Detection (text / audio / image / location / interactive)
      |
Voice -> Whisper transcription        Image -> GPT-4o Vision description
      |
Deduplication (never process the same WhatsApp message id twice)
      |
Conversation Memory (MongoDB, keyed by phone number)
      |
AI Agent (GPT-4o + OpenAI function calling)
      |
Tools: get_menu · search_menu · get_item_details · get_faq · get_menu_images
       calculate_order_total · create_order · get_order_status · confirm_order
      |
Response Formatter -> WhatsApp Cloud API -> Customer
```

Two equivalent ways to run the message pipeline are included:

1. **Direct mode (simplest):** point Meta's webhook straight at the backend (`/api/webhook/whatsapp`). The Node.js backend does everything — message-type detection, transcription, vision, the AI agent, and sending the reply.
2. **n8n mode:** point Meta's webhook at n8n instead. The included workflow (`n8n/smartserve-whatsapp-workflow.json`) does message-type routing, Whisper transcription, and GPT-4o Vision itself, then calls the backend's `POST /api/n8n/process-message` for the AI agent + database logic, and sends the WhatsApp reply itself. Use this if you want the visual n8n workflow to be the orchestration layer of record.

Either way, **all menu/order/FAQ logic and the database live in the Node.js backend** — n8n (if used) is a routing/orchestration front end, not a second copy of the business logic.

---

## 2. Folder structure

```
smartserve-ai/
├── backend/               Node.js + Express + MongoDB API and AI agent
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── config/db.js
│       ├── models/        Customer, MenuItem, Category, Order, Faq, Conversation, ProcessedMessage, Admin
│       ├── controllers/
│       ├── routes/
│       ├── services/      whatsappService, openaiService, aiAgentService, aiTools, toolSchemas, orderCalc
│       ├── middleware/
│       ├── utils/
│       └── scripts/seed.js
├── frontend/              React + Vite + Tailwind admin dashboard
│   └── src/
│       ├── api/client.js
│       ├── pages/         Login, Dashboard, Menu, Orders, Customers, Faqs, Conversations, Settings
│       └── components/
├── n8n/
│   └── smartserve-whatsapp-workflow.json
└── docs/
    ├── API.md
    ├── SETUP.md
    └── TESTING.md
```

---

## 3. Prerequisites (get these before you start)

| Credential | Where to get it |
|---|---|
| WhatsApp Business Cloud API access token + phone number ID | [Meta for Developers](https://developers.facebook.com/) → create an app → add "WhatsApp" product |
| A verify token | Any random string you invent — you'll enter the same string in Meta's webhook config and in your `.env` |
| OpenAI API key | [platform.openai.com](https://platform.openai.com/api-keys) |
| MongoDB connection string | [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier works) or a local `mongod` |

Full step-by-step credential setup is in [`docs/SETUP.md`](docs/SETUP.md).

---

## 4. Quick start (local)

### Backend

```bash
cd backend
cp .env.example .env
# edit .env and fill in MONGO_URI, WHATSAPP_*, OPENAI_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run seed     # creates sample menu, FAQs, and your admin login
npm run dev       # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env   # defaults to http://localhost:5000/api, edit if needed
npm install
npm run dev             # starts on http://localhost:5173
```

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `backend/.env`.

Customers can use `/customer/login` to create an account, browse the live menu, place delivery or pickup orders, track estimated preparation time, and review payment status. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env` to enable online checkout; COD and pay-on-pickup do not need payment credentials.

### Expose your local backend to WhatsApp

Meta needs a public HTTPS URL to send webhooks to. For local testing, use a tunnel:

```bash
ngrok http 5000
```

Then in Meta's App Dashboard → WhatsApp → Configuration:
- Callback URL: `https://<your-ngrok-domain>/api/webhook/whatsapp`
- Verify token: whatever you put in `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the `messages` webhook field.

---

## 5. Using n8n instead of calling the backend directly

1. Import `n8n/smartserve-whatsapp-workflow.json` into your n8n instance (n8n Cloud or self-hosted).
2. Create two n8n credentials of type **HTTP Header Auth**:
   - One named for Meta: header `Authorization`, value `Bearer <WHATSAPP_ACCESS_TOKEN>`
   - One named for OpenAI: header `Authorization`, value `Bearer <OPENAI_API_KEY>`
   Attach them to every HTTP Request node that calls `graph.facebook.com` or `api.openai.com` respectively.
3. Set these n8n environment variables (Settings → Environment): `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `OPENAI_API_KEY`, `BACKEND_URL` (your deployed backend, e.g. `https://smartserve-api.onrender.com`), `N8N_SHARED_SECRET` (must match the backend's `.env` value).
4. Activate the workflow and point Meta's webhook at n8n's production webhook URL instead of the backend.

---

## 6. Deployment

| Layer | Recommended host |
|---|---|
| Frontend | Vercel |
| Backend | Render (or Railway/Fly.io) |
| Database | MongoDB Atlas |
| Automation (optional) | n8n Cloud or self-hosted n8n |
| WhatsApp | Meta WhatsApp Cloud API |

Steps:
1. Push this repo to GitHub.
2. **Backend on Render:** New Web Service → point at `backend/` → build command `npm install` → start command `npm start` → add all `.env` variables in Render's dashboard → after first deploy, run `npm run seed` once via Render's shell.
3. **Frontend on Vercel:** New Project → point at `frontend/` → set `VITE_API_URL` to your Render backend URL + `/api` → deploy.
4. Update Meta's webhook callback URL to your Render backend's public HTTPS URL.
5. Use HTTPS everywhere — both Render and Vercel provide this automatically.

---

## 7. Payments

Cash on Delivery and Pay on Pickup work out of the box (no external credentials needed).

Razorpay checkout is available when the credentials are configured. The backend:
- Creating a Razorpay account and getting `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
- creates payment orders server-side;
- verifies the Razorpay signature server-side before setting `paymentStatus = PAID`;
- never trusts a frontend "payment succeeded" callback alone.

The order fields `razorpayOrderId` and `razorpayPaymentId` retain the payment audit references.

---

## 8. Safety guarantees built into this system

- **No invented prices/items:** every AI tool re-reads current price and availability from MongoDB.
- **No premature order confirmation:** `create_order` only stages `PENDING_CONFIRMATION`; only `confirm_order` — triggered by an explicit customer "yes"/"confirm"/"place order" — flips it to `CONFIRMED`, and that tool call is idempotent.
- **No duplicate orders:** every inbound WhatsApp message id is written to `ProcessedMessage` (unique index) before processing; retried webhooks are dropped.
- **No fake payment confirmations:** `paymentStatus` starts `UNPAID` and only a verified payment flow can change it.
- **No exposed secrets:** all credentials come from environment variables; the AI system prompt explicitly forbids revealing tool names, database details, or credentials.

---

## 9. Further docs

- [`docs/SETUP.md`](docs/SETUP.md) — detailed credential setup walkthrough
- [`docs/API.md`](docs/API.md) — full REST API reference
- [`docs/TESTING.md`](docs/TESTING.md) — manual test script covering all 20 required scenarios
