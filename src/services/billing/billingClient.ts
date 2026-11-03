/**
 * Premium subscriptions (Stripe) — the browser half. docs/systems/payments.md.
 *
 * Stripe hosts both payment pages (Checkout to subscribe, the Customer Portal to
 * cancel or change card), so no card detail ever passes through this app. This
 * module only asks the backend (routers/billing.py) for those pages' URLs and
 * reads back whether the account is Premium. Premium itself is decided on the
 * server (has_premium() → the quota RPC); nothing here can grant it.
 */
import { getAccessToken } from '../../lib/authToken';

// Same base as apiClient.ts: Vercel proxies '/api/*' in production.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

export type PremiumPlan = 'monthly' | 'yearly';

export interface PlanLimit {
  free: number;
  premium: number;
}

export interface SubscriptionSummary {
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

export interface BillingStatus {
  /** False until the owner sets the Stripe keys on the backend. */
  configured: boolean;
  plans: PremiumPlan[];
  /** From Stripe itself, so the page never shows a price Stripe won't charge. */
  prices: Partial<Record<PremiumPlan, PlanPrice>>;
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
  | 'network_error';

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
    const data = (await res.json()) as Partial<BillingStatus>;
    if (typeof data.configured !== 'boolean' || typeof data.premium !== 'boolean') return null;
    return {
      configured: data.configured,
      plans: Array.isArray(data.plans) ? data.plans : [],
      prices: data.prices ?? {},
      premium: data.premium,
      subscription: data.subscription ?? null,
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
    return fmt.format(price.amount / 10 ** digits);
  } catch {
    return null;
  }
}
