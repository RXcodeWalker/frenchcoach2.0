import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { Modal } from '../components/ui/Modal';
import { InlineAlert } from '../components/auth/InlineAlert';
import {
  BillingError,
  cancelRazorpaySubscription,
  defaultProvider,
  formatPrice,
  getBillingStatus,
  openBillingPortal,
  startCheckout,
  startRazorpayCheckout,
  syncCheckout,
  type BillingStatus,
  type PaymentProvider,
  type PremiumPlan,
} from '../services/billing/billingClient';

/**
 * Premium (docs/systems/payments.md, ADR 0014): a Stripe or Razorpay subscription that
 * raises the daily usage limits. Stripe hosts its payment and management pages;
 * Razorpay's payment window opens over this page (and, having no portal, is cancelled
 * here). This screen only shows the plans, starts the payment, and reads back the
 * result. It never decides Premium itself — the server does (has_premium → the quota RPC).
 *
 * Premium sells capacity, never marks: nothing here changes how an answer is marked,
 * and gems are not for sale (shop-economy.md §10).
 */

const FEATURE_ROWS: { key: keyof BillingStatus['limits']; label: string; unit: (n: number, premium: boolean) => string }[] = [
  { key: 'learn_answer', label: 'AI-marked Learn answers', unit: (n) => `${n} a day` },
  {
    key: 'exam_attempt',
    label: 'Full mock exams',
    // Free is one per rolling 7 days (server/examAllowance.ts); Premium is per day.
    unit: (n, premium) => (premium ? `${n} a day` : `${n} a week`),
  },
  { key: 'pronunciation_lab', label: 'Pronunciation Lab checks', unit: (n) => `${n} a day` },
];

const PLAN_LABEL: Record<PremiumPlan, string> = { monthly: 'Monthly', yearly: 'Yearly' };

// What a learner recognises, not the company name.
const PROVIDER_OPTION: Record<PaymentProvider, { label: string; note: string }> = {
  razorpay: { label: 'UPI & Indian cards', note: 'In rupees, by Razorpay' },
  stripe: { label: 'International card', note: 'By Stripe' },
};

const PAYMENT_LINE: Record<PaymentProvider, string> = {
  stripe: 'Secure payment by Stripe; we never see your card',
  razorpay: 'Secure payment by Razorpay (UPI, RuPay, cards); we never see your payment details',
};

function errorMessage(err: unknown): string {
  if (err instanceof BillingError) {
    switch (err.code) {
      case 'sign_in_required':
        return 'Sign in first — Premium belongs to your account.';
      case 'already_premium':
        return 'You already have Premium. Use Manage subscription to change it.';
      case 'not_configured':
        return "Premium isn't open yet. Please check back soon.";
      case 'no_billing_account':
        return 'There is no subscription on this account yet.';
      case 'network_error':
        return "Couldn't reach the server. Check your connection and try again.";
      case 'checkout_unavailable':
        return "The payment window couldn't open. Check your connection (or pause an ad blocker for this page) and try again.";
      default:
        return 'The payment service had a problem. Nothing was charged — please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Premium() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null | 'loading'>('loading');
  const [plan, setPlan] = useState<PremiumPlan>('monthly');
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handledReturn = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getBillingStatus();
    setStatus(next);
    if (next) {
      setProvider((current) => (current && next.providers.some((p) => p.id === current) ? current : defaultProvider(next.providers)));
    }
  }, []);

  // Stripe sends the learner back here: ?checkout=success&session_id=cs_… or ?checkout=cancelled.
  useEffect(() => {
    if (handledReturn.current) return;
    const result = params.get('checkout');
    const sessionId = params.get('session_id');
    if (!result) {
      void refresh();
      return;
    }
    handledReturn.current = true;
    setParams({}, { replace: true });
    if (result === 'cancelled') {
      setNotice('No payment was taken. You can subscribe whenever you like.');
      void refresh();
      return;
    }
    if (result === 'success' && sessionId && user) {
      void syncCheckout(sessionId)
        .then((r) => setNotice(r.premium ? "You're Premium now — your new limits apply straight away." : 'Payment received. Premium will switch on in a moment.'))
        .catch(() => setNotice('Payment received. Premium will switch on in a moment.'))
        .finally(() => void refresh());
      return;
    }
    void refresh();
  }, [params, setParams, refresh, user]);

  async function handleSubscribe() {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (activeProvider?.id === 'razorpay') {
      try {
        const result = await startRazorpayCheckout(shownPlan);
        setNotice(result.premium ? "You're Premium now — your new limits apply straight away." : 'Payment received. Premium will switch on in a moment.');
        await refresh();
      } catch (err) {
        if (err instanceof BillingError && err.code === 'checkout_cancelled') {
          setNotice('No payment was taken. You can subscribe whenever you like.');
        } else {
          setError(errorMessage(err));
        }
      }
      setBusy(false);
      return;
    }
    try {
      await startCheckout(shownPlan);
      // The browser is now leaving for Stripe; keep the button busy.
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function handleStopRenewing() {
    setConfirmCancel(false);
    setBusy(true);
    setError(null);
    try {
      await cancelRazorpaySubscription();
      setNotice("Your subscription won't renew. You keep Premium until the end of the period you paid for.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  }

  async function handleManage() {
    setBusy(true);
    setError(null);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const loaded = status !== 'loading' ? status : null;
  const premium = loaded?.premium ?? false;
  const sub = loaded?.subscription ?? null;
  const limits = loaded?.limits ?? {};
  const shownRows = FEATURE_ROWS.filter((row) => limits[row.key]);
  const providers = loaded?.providers ?? [];
  const activeProvider = providers.find((p) => p.id === provider) ?? providers[0] ?? null;
  const plans = activeProvider?.plans ?? [];
  const prices = activeProvider?.prices ?? {};
  // The plan picked under one provider may not exist under another.
  const shownPlan: PremiumPlan = plans.includes(plan) ? plan : (plans[0] ?? 'monthly');
  const periodEnd = formatDate(sub?.currentPeriodEnd ?? null);
  const paymentRetrying = sub?.status === 'past_due' || sub?.status === 'pending';

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Premium" subtitle="More marked practice, every day" />
      <PageShell maxWidth="sm">
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
        {error && <InlineAlert>{error}</InlineAlert>}

        {status === 'loading' ? (
          <p className="text-sm text-ink-muted" role="status">Loading…</p>
        ) : loaded === null ? (
          <Card>
            <p className="text-sm text-ink">Premium can't be loaded right now.</p>
            <p className="mt-1 text-xs text-ink-muted">Check your connection and open this page again.</p>
          </Card>
        ) : (
          <>
            {shownRows.length > 0 && (
              <Card eyebrow="What you get" title={premium ? 'Your Premium limits' : 'Free vs Premium'}>
                <table className="mt-3 w-full text-left text-sm" data-testid="premium-limits">
                  <thead>
                    <tr className="text-xs text-ink-muted">
                      <th className="pb-2 font-semibold">&nbsp;</th>
                      <th className="pb-2 font-semibold">Free</th>
                      <th className="pb-2 font-semibold text-action-text">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((row) => {
                      const l = limits[row.key]!;
                      return (
                        <tr key={row.key} className="border-t border-hairline">
                          <td className="py-2 pr-2 text-ink">{row.label}</td>
                          <td className="py-2 pr-2 text-ink-muted">{row.unit(l.free, false)}</td>
                          <td className="py-2 font-semibold text-ink">{row.unit(l.premium, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-ink-muted">
                  Premium gives you more practice. It never changes how your answers are marked.
                </p>
              </Card>
            )}

            {premium ? (
              <Card eyebrow="Your plan" title={sub?.plan ? `Premium · ${PLAN_LABEL[sub.plan]}` : 'Premium'}>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {paymentRetrying && (
                    <li className="text-correction-text">
                      {sub?.provider === 'razorpay'
                        ? "Your last payment didn't go through. Razorpay will try again — use the link in Razorpay's email or text to change how you pay and keep Premium."
                        : "Your last payment didn't go through. Update your card under Manage subscription to keep Premium."}
                    </li>
                  )}
                  {periodEnd && (
                    <li className="text-ink-muted">
                      {sub?.cancelAtPeriodEnd ? 'Ends on ' : 'Renews on '}
                      {periodEnd}
                    </li>
                  )}
                  {sub?.provider === 'razorpay' && (
                    <li className="text-xs text-ink-muted">Receipts come from Razorpay by email or text.</li>
                  )}
                </ul>
                {sub?.provider === 'razorpay' ? (
                  !sub.cancelAtPeriodEnd && (
                    <div className="mt-4">
                      <Button variant="secondary" onClick={() => setConfirmCancel(true)} loading={busy} data-testid="premium-stop-renewing">
                        Cancel subscription
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="mt-4">
                    <Button variant="secondary" onClick={handleManage} loading={busy} data-testid="premium-manage">
                      Manage subscription
                    </Button>
                  </div>
                )}
              </Card>
            ) : !loaded.configured ? (
              <Card>
                <p className="text-sm text-ink">Premium is coming soon.</p>
                <p className="mt-1 text-xs text-ink-muted">Everything you use today stays free.</p>
              </Card>
            ) : (
              <Card eyebrow="Choose a plan" title="Go Premium">
                {providers.length > 1 && activeProvider && (
                  <Segmented
                    className="mt-3"
                    label="Pay with"
                    value={activeProvider.id}
                    onChange={setProvider}
                    height={60}
                    testIdPrefix="premium-provider"
                    options={providers.map((p) => ({ id: p.id, ...PROVIDER_OPTION[p.id] }))}
                  />
                )}
                {plans.length > 1 && (
                  <Segmented
                    className="mt-3"
                    label="Billing period"
                    value={shownPlan}
                    onChange={setPlan}
                    height={60}
                    testIdPrefix="premium-plan"
                    options={plans.map((p) => ({
                      id: p,
                      label: PLAN_LABEL[p],
                      note: formatPrice(prices[p]) ? `${formatPrice(prices[p])} / ${p === 'yearly' ? 'year' : 'month'}` : undefined,
                    }))}
                  />
                )}
                {plans.length === 1 && formatPrice(prices[shownPlan]) && (
                  <p className="mt-3 font-numeral text-2xl text-ink">
                    {formatPrice(prices[shownPlan])}
                    <span className="text-sm text-ink-muted"> / {shownPlan === 'yearly' ? 'year' : 'month'}</span>
                  </p>
                )}
                <ul className="mt-4 space-y-1.5 text-sm text-ink">
                  {['Cancel any time — you keep Premium until the end of the period you paid for', PAYMENT_LINE[activeProvider?.id ?? 'stripe']].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-progress-text" />
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {user ? (
                    <Button size="lg" className="w-full" onClick={handleSubscribe} loading={busy} data-testid="premium-subscribe">
                      Continue to payment
                    </Button>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex h-12 w-full items-center justify-center rounded-control bg-action px-5 text-[15px] font-semibold text-action-ink hover:bg-action-hover"
                      data-testid="premium-sign-in"
                    >
                      Sign in to subscribe
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </PageShell>
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Stop renewing Premium?"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep Premium
            </Button>
            <Button onClick={handleStopRenewing} data-testid="premium-confirm-stop">
              Stop renewing
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink">
          You won't be charged again. You keep Premium{periodEnd ? ` until ${periodEnd}` : ' until the end of the period you paid for'}.
        </p>
      </Modal>
    </div>
  );
}
