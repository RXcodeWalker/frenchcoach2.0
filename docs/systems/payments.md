# Payments — Premium subscriptions (Stripe)

> Live specification. Decision record: `docs/decisions/0014-premium-sells-capacity-through-stripe.md`.

## §1 What Premium is

A monthly or yearly subscription — through Stripe (international cards) or Razorpay (UPI, RuPay and Indian
cards, in rupees; §6) — that raises three daily limits. Nothing else changes: not a mark,
a band, feedback, difficulty, XP or gems. Gems are not for sale (`shop-economy.md` §10).

| Limit | Free | Premium (starting numbers) | Where it lives |
|---|---|---|---|
| AI-marked Learn answers | 3 / day | 30 / day | `ai_quota_limits` row `learn_answer` |
| Mock exams | 1 / rolling 7 days | 1 / day (no weekly window) | `exam_attempt` + `server/examAllowance.ts` |
| Pronunciation Lab checks | 30 / day | 60 / day | `pronunciation_lab` |

Change a Premium number with SQL, no deploy:

```sql
UPDATE public.ai_quota_limits SET premium_daily_limit = 50 WHERE feature = 'learn_answer';
```

`NULL` = Premium gets the free number. **Never set it below `daily_limit`** — that would cut paying users back.

## §2 How it fits together

```
Browser (/premium)                 FastAPI (routers/billing.py)          Stripe
  "Continue to payment" ── POST /api/billing/checkout ──► create Customer + Checkout Session
  ◄──────────────── redirect to checkout.stripe.com ◄─────────────────── (Stripe hosts the card form)
  back on /premium?checkout=success ── POST /api/billing/sync ──► re-read session + subscription
                                    ◄── POST /api/billing/webhook ◄───── signed events (renewals, failures, cancels)
                                         │ re-reads the subscription from Stripe, upserts billing_subscriptions
Every AI call ── consume_ai_quota() ── has_premium()? → premium_daily_limit : daily_limit
```

- **Tables** (migration `20261104100000`, backend repo): `billing_customers`, `billing_subscriptions`,
  `stripe_webhook_events`. Service role writes; a user can only read their own subscription row.
- **Premium = `has_premium(user)`**: a subscription with status `active`, `trialing` or `past_due` (Stripe is
  still retrying the card), whose period ended no more than 3 days ago.
- **Routes**: `POST /checkout`, `POST /portal` (Stripe Customer Portal: cancel, change card, invoices),
  `GET /status` (plans, prices from Stripe, limits, this account's state), `POST /sync`,
  `POST /cancel-for-deletion`, `POST /webhook`.
- **Frontend**: `src/services/billing/billingClient.ts`, `src/screens/Premium.tsx` (route `/premium`, behind
  the `premium` flag), `features/premium/PremiumLink.tsx` (shown at the Learn and exam limits and in Profile
  only while the flag is live). Learn caps a session by the server's Premium limit only when the allowance
  says `premium: true` (`learnDailyLimit`), never by a guest's looser backend cap.
- **Razorpay** is the same design with its own table and routes — §6.
- **Account deletion** cancels live subscriptions (both providers) first; the database refuses to delete a profile that is still
  being charged (`active_subscription`).

## §3 Owner setup (one time) — test mode first

1. **Stripe account** → stay in **Test mode** (toggle top-right).
2. **Product**: Product catalog → Add product "Premium" → add two **recurring** prices (monthly, yearly). Copy
   both `price_…` ids.
3. **Customer Portal**: Settings → Billing → Customer portal → turn on "Cancel subscriptions" and "Update payment
   methods" → Save. (Without this, "Manage subscription" errors.)
4. **Webhook**: Developers → Webhooks → Add endpoint
   - URL: `https://french-coach-backend.onrender.com/api/billing/webhook` (point Stripe straight at the backend,
     not through Vercel)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret `whsec_…`.
5. **Render → FastAPI service → Environment**: `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`. Optional: `BILLING_APP_URL` (default: the request's allowed
   origin, else `https://french.beyondthebasics.me`), `STRIPE_AUTOMATIC_TAX=1` (only after Stripe Tax is set up).
6. **Supabase**: apply backend migration `20261104100000_premium_billing.sql` to production. Until it is applied,
   both services keep working on the free limits (they fall back when the column is missing), but nobody can
   be Premium.
7. **Try it**: open `/premium?ff_premium=live`, subscribe with card `4242 4242 4242 4242`, any future date, any
   CVC. Check: the page says Premium, Learn shows 30 answers a day, Manage subscription opens the portal,
   cancelling there shows "Ends on …".
8. **Go live**: switch Stripe to Live mode, repeat steps 2–5 with live ids/keys, then set
   `premium: 'live'` in `src/config/featureFlags.ts`.

## §4 Rules

- Never trust an event payload's status or a browser's user id: always re-read the subscription from Stripe.
- `has_premium()`'s status list and `PREMIUM_STATUSES` in `routers/billing.py` change together.
- Every new limit Premium should raise is a `premium_daily_limit` value, never an `if premium` in a route.
- No card data, request bodies or Stripe secrets in logs, Sentry or analytics.

## §5 Known gaps

- **Tax**: Stripe is not the merchant of record; VAT/sales tax registration is the owner's job.
- **Refunds**: done by hand in the Stripe dashboard; a refunded-and-cancelled subscription syncs via webhook.
- **The DB integration test** for the migration is not in `backend/supabase/tests/` yet; the migration's SQL was
  verified against a plain Postgres 16 stub (2026-11-03, see `verification-log.md`).
- **Azure F0's monthly speech cap** is shared by everyone: raising Lab checks for Premium does not raise it.
- **One account, two providers**: nothing stops a lapsed (`halted`) Razorpay subscriber from subscribing again
  through either provider; the halted one is cancelled only on account deletion. Rare, not money-losing.

## §6 Razorpay (second provider, 2026-11-04)

**Why**: UPI Autopay, RuPay and Indian cards with RBI-compliant e-mandates, priced in rupees. Same Premium, same
limits, same `has_premium()`.

**How it differs from Stripe**

| | Stripe | Razorpay |
|---|---|---|
| Payment page | Stripe-hosted page (redirect) | Razorpay's window over `/premium` (`checkout.js`, loaded only on tap) |
| Account link | `billing_customers` + Checkout metadata | the `billing_razorpay_subscriptions` row the backend inserts when it creates the subscription (+ `notes.user_id`) |
| Manage / cancel | Stripe Customer Portal | in-app "Cancel subscription" → `POST /api/billing/razorpay/cancel` (stops at the period end) |
| Change payment method | Portal | Razorpay's own emails/texts (it notifies the customer) |
| Premium statuses | `active`, `trialing`, `past_due` | `active`, `pending` (renewal failed, retrying). `authenticated` is not Premium yet |
| Webhook signature | `Stripe-Signature` (with timestamp) | `X-Razorpay-Signature` = HMAC-SHA256(raw body); no timestamp, harmless because every event is re-read |

- Routes: `POST /api/billing/razorpay/subscribe {plan}` → `{keyId, subscriptionId}`; `/sync {subscriptionId}` (only
  a subscription this account's row owns); `/cancel`; `/webhook`. `/api/billing/status` lists each configured
  provider (`providers: [{id, plans, prices}]`) and the subscription's `provider`.
- The browser never sends Razorpay's payment id or signature: `/sync` re-reads the subscription itself.
- Razorpay has no cancel-at-period-end flag, so ours (`cancel_at_period_end`) is set by `/cancel` and kept; a
  cycle-end cancel made in the Razorpay dashboard only shows when the period ends.
- When both providers are on, the page asks "Pay with": **UPI & Indian cards** or **International card**, defaulting
  to Razorpay for a browser in India's time zone. Each shows its own plans and prices.

**Owner setup (test mode first)**

1. Razorpay Dashboard → **Test mode**. Settings → API Keys → Generate: copy the Key Id (`rzp_test_…`) and Secret.
2. Subscriptions → Plans → Create plan: "Premium monthly" (period Monthly, interval 1, amount e.g. ₹199) and
   optionally "Premium yearly" (Yearly, 1). Copy both `plan_…` ids. (Subscriptions may need activating on the
   account first.)
3. Settings → Webhooks → Add: URL `https://french-coach-backend.onrender.com/api/billing/razorpay/webhook`, a secret
   you type (keep it), events: `subscription.authenticated`, `subscription.activated`, `subscription.charged`,
   `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`,
   `subscription.paused`, `subscription.resumed`, `subscription.updated`.
4. Render → FastAPI → Environment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`,
   `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_WEBHOOK_SECRET`. Optional: `RAZORPAY_TOTAL_COUNT_MONTHLY` (default 120 cycles) /
   `_YEARLY` (default 10) — how long one subscription may run before the learner re-subscribes; Razorpay caps this
   per payment method, so lower it if creation errors.
5. Supabase: apply backend migration `20261105090000_razorpay_billing.sql` (after `20261104100000`).
6. Try it: `/premium?ff_premium=live` → UPI & Indian cards → subscribe with Razorpay's test card or test UPI id
   (`success@razorpay`). Check: Premium shows, Learn allows 30, "Cancel subscription" → "Ends on …".
7. Go live: Razorpay KYC + live mode, repeat 1–4 with live keys and plans.
