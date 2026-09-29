# Setup Guide — Getting Every Credential

This walks through obtaining every value in `backend/.env.example`, in order.

## 1. MongoDB (`MONGO_URI`)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Database Access → add a database user with a username/password.
3. Network Access → allow your IP (or `0.0.0.0/0` for quick testing; restrict in production).
4. Clusters → Connect → "Drivers" → copy the connection string, e.g.:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/smartserve_ai?retryWrites=true&w=majority
   ```
5. Paste it into `MONGO_URI`.

## 2. WhatsApp Cloud API

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App** → type **Business**.
2. In the app dashboard, add the **WhatsApp** product.
3. Under WhatsApp → **API Setup** you'll see:
   - A **temporary access token** (24h — fine for testing) and a **test phone number**.
   - For production, go to **WhatsApp → Configuration** and generate a **permanent token** via a System User in Meta Business Settings, and add/verify your own business phone number.
4. Copy the **Phone number ID** shown on the API Setup page → `WHATSAPP_PHONE_NUMBER_ID`.
5. Copy the access token → `WHATSAPP_ACCESS_TOKEN`.
6. Invent any random string (e.g. generate one with `openssl rand -hex 16`) → `WHATSAPP_VERIFY_TOKEN`. You'll enter this same string in the webhook config screen in step 8.
7. Note the WhatsApp Business Account ID shown on the same page → `WHATSAPP_BUSINESS_ACCOUNT_ID` (optional, for reference).
8. Under **WhatsApp → Configuration → Webhook**, click **Edit**, enter:
   - Callback URL: `https://<your-backend-domain>/api/webhook/whatsapp`
   - Verify token: the same string as `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and Save**, then **Manage** → subscribe to the `messages` field.

Your backend must already be deployed (or tunneled via ngrok) and running before you click "Verify and Save" — Meta calls your `GET` endpoint immediately to confirm it.

## 3. OpenAI (`OPENAI_API_KEY`)

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a new secret key.
3. Ensure your account has billing enabled — Whisper transcription and GPT-4o both require it.
4. Paste the key into `OPENAI_API_KEY`.

## 4. JWT secret (`JWT_SECRET`)

Any long random string, e.g.:
```bash
openssl rand -hex 32
```

## 5. Admin login (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)

Pick any email/password — running `npm run seed` creates this admin account in the database so you can log into the dashboard. Change the password after first login in a production deployment (there's no self-service password change UI yet — update it directly in MongoDB or re-run the seed script with a new password after deleting the existing admin document).

## 6. Customer ordering portal

Open `/customer/login` in the frontend. Customers create their own account with name, email, password, phone, and an optional delivery address. They can browse available menu items, place delivery or pickup orders, track the estimated preparation time, and see payment status under **My orders**.

## 7. Razorpay (optional online checkout)

Only needed for the customer portal's **Pay online** option. Sign up at [razorpay.com](https://razorpay.com/), go to **Settings → API Keys**, generate a key pair, and fill `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. The backend creates Razorpay orders and verifies the payment signature before marking an order paid. COD and pay-on-pickup work without these keys.

## 8. n8n shared secret (optional, only if using the n8n workflow)

Any random string, must match between `backend/.env`'s `N8N_SHARED_SECRET` and the n8n environment variable of the same name.

---

## Verifying everything works end-to-end

1. Start the backend, confirm `GET /` returns `{"service":"SmartServe AI Backend","status":"running"}`.
2. Run `npm run seed`.
3. Send a WhatsApp message to your business number: "Hi".
4. You should get a greeting back within a few seconds. Check the backend logs for any errors (usually a missing/incorrect credential).
5. Log into the admin dashboard and confirm the conversation appears under **Conversations**.
