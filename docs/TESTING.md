# Testing Guide

Manual test script covering the 20 scenarios from the spec. Run these against a real WhatsApp number connected to your backend (or against `POST /api/n8n/process-message` directly with Postman/curl if you want to skip WhatsApp for early testing — see "Testing without WhatsApp" below).

## Testing without WhatsApp (fast iteration)

Call the agent directly:
```bash
curl -X POST http://localhost:5000/api/n8n/process-message \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: $N8N_SHARED_SECRET" \
  -d '{"phone":"919999999999","text":"Hi","messageType":"text","whatsappMessageId":"test-1"}'
```
Change `whatsappMessageId` on each call (dedup will reject a repeat). This exercises the full AI agent + database logic without needing a live WhatsApp number.

## Scenarios

1. **Text greeting** — send "Hi". Expect a friendly welcome mentioning menu/order/status/FAQ options.
2. **Menu request** — "Show me the menu." Expect real items from the seeded database with real prices.
3. **Search item** — "Do you have something spicy?" Expect items tagged/described as spicy (Spicy Chicken Burger, Chicken Wings).
4. **Voice order** — send a voice note saying "Give me two chicken burgers and one Pepsi." Expect a transcribed, correctly-quantified cart.
5. **Image request** — "Show me the burger" (text) or send a photo and ask about it. Expect an image message sent back with caption (name + price).
6. **Add item** — after building a cart, send "Add fries." Expect the cart to grow, not replace.
7. **Remove item** — "Remove the Pepsi." Expect the AI to acknowledge and adjust (verify by asking for the total again).
8. **Change quantity** — "Make that 3 chicken burgers instead." Expect quantity updated, not duplicated.
9. **Multiple items** — "2 spicy chicken burgers, 1 fries, 1 lemonade." Expect all three lines priced correctly.
10. **Address collection** — choose "Delivery" and expect the AI to explicitly ask for an address before totaling.
11. **Order calculation** — expect subtotal + delivery fee + tax to sum exactly (check `calculate_order_total` math against `docs/API.md` — it never lets the model do the arithmetic).
12. **Order confirmation** — say "Yes" after seeing the summary. Expect `✅ ORDER CONFIRMED!` with a real order ID, and the order to appear in the admin dashboard **Orders** page as `CONFIRMED`.
13. **Order cancellation** — from the admin dashboard, set an order's status to `CANCELLED`. Expect the customer to receive a WhatsApp cancellation notice.
14. **FAQ** — "What are your delivery areas?" Expect the seeded FAQ answer, not an invented one.
15. **Unknown question** — ask something with no matching FAQ or menu item (e.g. "Do you sell sushi?"). Expect an honest "not available" answer, no invented item.
16. **Unavailable item** — mark an item unavailable in the admin dashboard, then ask for it on WhatsApp. Expect the AI to say it's unavailable and suggest alternatives.
17. **Duplicate WhatsApp message** — resend the exact same webhook payload (same message id) to `/api/webhook/whatsapp`. Expect it to be silently ignored (check backend logs for "Duplicate message ... ignored") and **no** second order/reply.
18. **Database failure** — temporarily point `MONGO_URI` at an invalid host and restart the backend; confirm it exits cleanly with a clear error rather than serving requests that would silently fail.
19. **AI failure** — temporarily set an invalid `OPENAI_API_KEY` and send a message; expect the fallback message: "Sorry, I'm having trouble processing that right now. Please try again."
20. **WhatsApp API failure** — temporarily set an invalid `WHATSAPP_ACCESS_TOKEN`; confirm the backend logs a retry attempt and a clear error rather than crashing.

## Automated smoke test (optional)

A minimal Node script you can adapt to hit the endpoints above in sequence lives conceptually in this checklist — since it depends on your live OpenAI/WhatsApp credentials, it's intentionally left as a manual script rather than a fake CI test that would need mocked responses to "pass" without proving anything real.
