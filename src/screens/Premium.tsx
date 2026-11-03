import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { InlineAlert } from '../components/auth/InlineAlert';
import {
  BillingError,
  formatPrice,
  getBillingStatus,
  openBillingPortal,
  startCheckout,
  syncCheckout,
  type BillingStatus,
  type PremiumPlan,
} from '../services/billing/billingClient';

/**
 * Premium (docs/systems/payments.md, ADR 0014): a Stripe subscription that raises the
 * daily usage limits. Stripe hosts the payment and management pages; this screen only
 * shows the plans, sends the learner there, and reads back the result. It never
 * decides Premium itself — the server does (has_premium → the quota RPC).
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handledReturn = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getBillingStatus();
    setStatus(next);
    if (next && next.plans.length > 0) setPlan((current) => (next.plans.includes(current) ? current : next.plans[0]));
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
    try {
      await startCheckout(plan);
      // The browser is now leaving for Stripe; keep the button busy.
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
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
                  {sub?.status === 'past_due' && (
                    <li className="text-correction-text">Your last payment didn't go through. Update your card under Manage subscription to keep Premium.</li>
                  )}
                  {formatDate(sub?.currentPeriodEnd ?? null) && (
                    <li className="text-ink-muted">
                      {sub?.cancelAtPeriodEnd ? 'Ends on ' : 'Renews on '}
                      {formatDate(sub?.currentPeriodEnd ?? null)}
                    </li>
                  )}
                </ul>
                <div className="mt-4">
                  <Button variant="secondary" onClick={handleManage} loading={busy} data-testid="premium-manage">
                    Manage subscription
                  </Button>
                </div>
              </Card>
            ) : !loaded.configured ? (
              <Card>
                <p className="text-sm text-ink">Premium is coming soon.</p>
                <p className="mt-1 text-xs text-ink-muted">Everything you use today stays free.</p>
              </Card>
            ) : (
              <Card eyebrow="Choose a plan" title="Go Premium">
                {loaded.plans.length > 1 && (
                  <Segmented
                    className="mt-3"
                    label="Billing period"
                    value={plan}
                    onChange={setPlan}
                    height={60}
                    testIdPrefix="premium-plan"
                    options={loaded.plans.map((p) => ({
                      id: p,
                      label: PLAN_LABEL[p],
                      note: formatPrice(loaded.prices[p]) ? `${formatPrice(loaded.prices[p])} / ${p === 'yearly' ? 'year' : 'month'}` : undefined,
                    }))}
                  />
                )}
                {loaded.plans.length === 1 && formatPrice(loaded.prices[plan]) && (
                  <p className="mt-3 font-numeral text-2xl text-ink">
                    {formatPrice(loaded.prices[plan])}
                    <span className="text-sm text-ink-muted"> / {plan === 'yearly' ? 'year' : 'month'}</span>
                  </p>
                )}
                <ul className="mt-4 space-y-1.5 text-sm text-ink">
                  {['Cancel any time — you keep Premium until the end of the period you paid for', 'Secure payment by Stripe; we never see your card'].map((line) => (
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
    </div>
  );
}
