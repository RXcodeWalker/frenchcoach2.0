# 0014 — Premium sells capacity through a Stripe subscription, not gems or marks

Date: 2026-11-03
Status: Accepted (owner decision 2026-11-03)

## Decision

1. **What is sold is a monthly/yearly Premium subscription that raises the daily usage limits**
   (AI-marked Learn answers, mock exams, Pronunciation Lab checks). Nothing else.
2. **Gems are not sold.** `shop-economy.md` §10 keeps its hard gate: no real-money gems before Phase 7,
   because gems can still be minted client-side (capped) — buyers would pay for what a forger gets free.
3. **Premium never changes a mark, band, score, feedback or difficulty.** It changes only how many times a
   learner may ask. Nothing in `src/domain/igcse/`, `scripts/scoring/` or the feedback prompts reads it.
4. **Stripe is the provider and hosts every payment page** (Checkout, Customer Portal). No card detail
   touches this app or its servers.
5. **Stripe is the source of truth; the database is a mirror.** Only the FastAPI service writes
   `billing_*` rows, from a subscription it re-read from Stripe after a signed webhook or a signed-in
   `/sync`. The browser can never assert Premium.
6. **Premium is enforced where the limits already are**: `consume_ai_quota` reads
   `ai_quota_limits.premium_daily_limit` for an account `has_premium()` says is subscribed, and the
   scoring service's exam allowance swaps the free 1-per-7-days window for that per-day limit. The numbers
   are data (an `UPDATE`), not code.
7. **An account that is still being charged cannot be deleted.** The app cancels first; a database
   trigger refuses otherwise.

## Why

- The limits are the real cost driver (every marked answer is a paid model call), and they are already
  server-enforced, so selling more of them is honest and needs no new trust surface.
- Re-reading the subscription from Stripe makes webhook order, duplicates and replays harmless.
- A hosted checkout keeps the app out of card-data scope entirely.

## Consequences

- Billing is off (`503 billing_not_configured`, page says "coming soon") until the Stripe env vars exist;
  the `premium` feature flag hides the page and its links until the owner flips it.
- Sales tax/VAT is the owner's responsibility (Stripe is not the merchant of record); Stripe Tax can be
  switched on with `STRIPE_AUTOMATIC_TAX=1` once configured in the Stripe dashboard.
- Spec and setup steps: `docs/systems/payments.md`.

## Amendment — Razorpay as a second provider (owner, 2026-11-04)

Razorpay is added beside Stripe for UPI Autopay, RuPay and Indian cards in rupees. Every rule above holds for it
unchanged: it sells the same capacity, its payment window is Razorpay's own (`checkout.js`), its rows
(`billing_razorpay_subscriptions`) are written only by the FastAPI service from a subscription re-read from
Razorpay, and `has_premium()` reads both providers. Razorpay has no customer portal, so cancelling (at the period
end) is an in-app button that calls the backend. Details: `payments.md` §6.
