/**
 * Premium subscriptions (Stripe and Razorpay) — the browser half.
 * docs/systems/payments.md.
 *
 * Stripe hosts both its payment pages (Checkout to subscribe, the Customer Portal
 * to cancel or change card). Razorpay's Checkout is its own script
 * (checkout.razorpay.com, loaded only when the learner taps subscribe) that opens
 * Razorpay's payment window over the page. Either way no card or UPI detail ever
 * passes through this app. This module only asks the backend (routers/billing.py,
 * routers/billing_razorpay.py) to start a payment and reads back whether the
 * account is Premium. Premium itself is decided on the server (has_premium() →
 * the quota RPC); nothing here can grant it.
 */
import { getAccessToken } from '../../lib/authToken';

// Same base as apiClient.ts: Vercel proxies '/api/*' in production.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

export type PremiumPlan = 'monthly' | 'yearly';
export type PaymentProvider = 'stripe' | 'razorpay';

export interface PlanLimit {
  free: number;
  premium: number;
}

export interface SubscriptionSummary {
  /** Who bills it: decides whether "Manage" opens Stripe's portal or this app's cancel. */
  provider: PaymentProvider;
  /** Stripe's or Razorpay's own status (past_due / pending = a charge failed and is being retried). */
  status: string;
  plan: PremiumPlan | null;
  /** ISO time the current paid period ends (renews, or ends if cancelled). */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanPrice {
  /** In the currency's smallest unit (pence, cents), as Stripe gives it. */
  amount: number | null;
  currency: string | null;
  interval: string | null;
}

export interface ProviderInfo {
  id: PaymentProvider;
  plans: PremiumPlan[];
  /** From the provider itself, so the page never shows a price it won't charge. */
  prices: Partial<Record<PremiumPlan, PlanPrice>>;
}

export interface BillingStatus {
  /** False until the owner sets a provider's keys on the backend. */
  configured: boolean;
  /** Every provider the backend can take a payment through, in its order. */
  providers: ProviderInfo[];
  premium: boolean;
  subscription: SubscriptionSummary | null;
  /** Per feature (learn_answer, exam_attempt, pronunciation_lab). */
  limits: Partial<Record<'learn_answer' | 'exam_attempt' | 'pronunciation_lab', PlanLimit>>;
}

export type BillingErrorCode =
  | 'sign_in_required'
  | 'already_premium'
  | 'not_configured'
  | 'no_billing_account'
  | 'provider_error'
  | 'network_error'
  /** The learner closed Razorpay's payment window. Not an error to show loudly. */
  | 'checkout_cancelled'
  /** Razorpay's checkout script could not load (offline, or blocked by an extension). */
  | 'checkout_unavailable';

export class BillingError extends Error {
  code: BillingErrorCode;
  constructor(code: BillingErrorCode, message = code) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
  }
}

async function authHeaders(required: boolean): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    if (required) throw new BillingError('sign_in_required');
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

function errorCodeFor(status: number, body: unknown): BillingErrorCode {
  const detail = (body as { detail?: { error?: string } } | null)?.detail;
  const code = detail?.error;
  if (status === 401) return 'sign_in_required';
  if (code === 'already_premium') return 'already_premium';
  if (code === 'billing_not_configured') return 'not_configured';
  if (code === 'no_billing_account') return 'no_billing_account';
  return 'provider_error';
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const headers = { ...(await authHeaders(true)), 'Content-Type': 'application/json' };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new BillingError('network_error');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new BillingError(errorCodeFor(res.status, data));
  return data as T;
}

/** Plans, limits and (signed in) this account's Premium state. null when unreadable. */
export async function getBillingStatus(): Promise<BillingStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/billing/status`, { headers: await authHeaders(false) });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<BillingStatus> & {
      plans?: PremiumPlan[];
      prices?: ProviderInfo['prices'];
    };
    if (typeof data.configured !== 'boolean' || typeof data.premium !== 'boolean') return null;
    let providers = Array.isArray(data.providers)
      ? data.providers.filter((p) => (p.id === 'stripe' || p.id === 'razorpay') && Array.isArray(p.plans) && p.plans.length > 0)
      : null;
    // A backend from before Razorpay sent Stripe's plans at the top level only.
    if (providers === null) {
      const plans = Array.isArray(data.plans) ? data.plans : [];
      providers = data.configured && plans.length > 0 ? [{ id: 'stripe', plans, prices: data.prices ?? {} }] : [];
    }
    const sub = data.subscription ?? null;
    return {
      configured: data.configured,
      providers: providers.map((p) => ({ id: p.id, plans: p.plans, prices: p.prices ?? {} })),
      premium: data.premium,
      subscription: sub ? { ...sub, provider: sub.provider === 'razorpay' ? 'razorpay' : 'stripe' } : null,
      limits: data.limits ?? {},
    };
  } catch {
    return null;
  }
}

/** Sends the browser to Stripe Checkout. Resolves only if navigation is stubbed. */
export async function startCheckout(plan: PremiumPlan, go: (url: string) => void = (u) => window.location.assign(u)): Promise<void> {
  const { url } = await post<{ url: string }>('/api/billing/checkout', { plan });
  go(url);
}

/** Sends the browser to Stripe's Customer Portal (cancel, change card, invoices). */
export async function openBillingPortal(go: (url: string) => void = (u) => window.location.assign(u)): Promise<void> {
  const { url } = await post<{ url: string }>('/api/billing/portal');
  go(url);
}

/** After Checkout returns: confirm the subscription now rather than waiting for the webhook. */
export async function syncCheckout(sessionId: string): Promise<{ premium: boolean }> {
  return post<{ premium: boolean }>('/api/billing/sync', { sessionId });
}

// ── Razorpay ─────────────────────────────────────────────────────────────────

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
  theme?: { color: string };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: () => void) => void;
}

export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

let scriptPromise: Promise<RazorpayConstructor> | null = null;

/** Loads Razorpay's checkout script once, only when someone pays with it. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new BillingError('checkout_unavailable'));
    };
    script.onerror = () => reject(new BillingError('checkout_unavailable'));
    document.head.appendChild(script);
  }).catch((err: unknown) => {
    scriptPromise = null; // let the next tap try again
    throw err;
  });
  return scriptPromise;
}

export interface RazorpayCheckoutResult {
  premium: boolean;
}

/**
 * Pays with Razorpay: the backend creates the subscription, Razorpay's own window
 * takes the payment (UPI, cards, netbanking), then the backend re-reads the
 * subscription. Resolves once the server has looked; rejects with
 * `checkout_cancelled` if the learner closes the window.
 *
 * The handler's payment id and signature are deliberately not sent: the server
 * trusts nothing the browser says except which of its own subscriptions to re-read.
 */
export async function startRazorpayCheckout(
  plan: PremiumPlan,
  load: () => Promise<RazorpayConstructor> = loadRazorpay,
): Promise<RazorpayCheckoutResult> {
  const { keyId, subscriptionId } = await post<{ keyId: string; subscriptionId: string }>(
    '/api/billing/razorpay/subscribe',
    { plan },
  );
  const Razorpay = await load();
  const paid = await new Promise<boolean>((resolve) => {
    const checkout = new Razorpay({
      key: keyId,
      subscription_id: subscriptionId,
      name: 'French Coach',
      description: plan === 'yearly' ? 'Premium · yearly' : 'Premium · monthly',
      handler: () => resolve(true),
      modal: { ondismiss: () => resolve(false) },
    });
    checkout.open();
  });
  if (!paid) throw new BillingError('checkout_cancelled');
  try {
    return await post<RazorpayCheckoutResult>('/api/billing/razorpay/sync', { subscriptionId });
  } catch {
    // Paid, but the re-read failed: the webhook will switch Premium on.
    return { premium: false };
  }
}

/** Stops a Razorpay subscription renewing. Premium stays until the paid period ends. */
export async function cancelRazorpaySubscription(): Promise<void> {
  await post('/api/billing/razorpay/cancel');
}

/** Which payment option to offer first: Razorpay for a browser set to India's time zone. */
export function defaultProvider(providers: ProviderInfo[], timeZone?: string): PaymentProvider | null {
  if (providers.length === 0) return null;
  let tz = timeZone;
  if (tz === undefined) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = '';
    }
  }
  const inIndia = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
  const preferred = providers.find((p) => p.id === (inIndia ? 'razorpay' : 'stripe'));
  return (preferred ?? providers[0]).id;
}

/**
 * Cancels any live subscription before the account is deleted (the database refuses
 * to delete an account that is still being charged). A backend with billing switched
 * off has nothing to cancel, so `not_configured` counts as done.
 */
export async function cancelSubscriptionsForDeletion(): Promise<void> {
  try {
    await post<{ canceled: number }>('/api/billing/cancel-for-deletion');
  } catch (err) {
    if (err instanceof BillingError && err.code === 'not_configured') return;
    throw err;
  }
}

/** "£4.99" — null when Stripe gave no usable amount. */
export function formatPrice(price: PlanPrice | undefined, locale?: string): string | null {
  if (!price || typeof price.amount !== 'number' || !price.currency) return null;
  try {
    const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency.toUpperCase() });
    // Stripe's smallest unit: pence for GBP (2 digits), whole yen for JPY (0 digits).
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
    const value = price.amount / 10 ** digits;
    // A whole amount reads "₹199", not "₹199.00".
    if (Number.isInteger(value) && digits > 0) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }
    return fmt.format(value);
  } catch {
    return null;
  }
}
