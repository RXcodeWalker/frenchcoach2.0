/**
 * One sample exam per account per rolling 7 days (launch limit, owner decision 2026-10-24).
 *
 * POST /score charges `exam_attempt` with the exam's sessionId (backend migration
 * 20261025090000). consume_ai_quota counts per UTC day, so the 7-day window is checked
 * here, from the account's exam_attempt grants, before the charge. Grant dates are UTC
 * days, so "7 days" is 7 calendar days: an exam on a Monday unlocks the next one on the
 * following Monday (00:00 UTC). A retry of the same attempt (same sessionId) is never
 * counted against itself.
 *
 * Premium (Stripe subscription, backend routers/billing.py): no 7-day window; instead
 * the per-UTC-day Premium limit in ai_quota_limits.premium_daily_limit (exam_attempt),
 * which consume_ai_quota itself also enforces. NULL there = Premium has the free rule.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const EXAM_ATTEMPT_FEATURE = 'exam_attempt';
export const EXAM_WINDOW_DAYS = 7;

export interface ExamAllowance {
  allowed: boolean;
  /** True when the Premium rule (per day, no weekly window) was applied. */
  premium: boolean;
  /** UTC date (YYYY-MM-DD) of the latest exam inside the window, if any. */
  lastExamDate: string | null;
  /** When the next exam unlocks (ISO, 00:00 UTC), or null when one is allowed now. */
  nextAvailableAt: string | null;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): Date {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** The first UTC day still inside the window that ends today. */
export function windowStart(now: Date): string {
  return utcDay(addDays(utcDay(now), -(EXAM_WINDOW_DAYS - 1)));
}

/** Which rule applies to this account (loadExamPlan). */
export interface ExamPlan {
  premium: boolean;
  /** Exams a Premium account may sit per UTC day; only read when `premium`. */
  premiumDailyLimit: number | null;
}

export const FREE_EXAM_PLAN: ExamPlan = { premium: false, premiumDailyLimit: null };

/** Pure: the allowance given the UTC grant dates of the account's other exams. */
export function examAllowanceFrom(grantDates: string[], now: Date, plan: ExamPlan = FREE_EXAM_PLAN): ExamAllowance {
  const start = windowStart(now);
  const inWindow = grantDates.filter((d) => d >= start).sort();
  const last = inWindow.length > 0 ? inWindow[inWindow.length - 1] : null;
  if (plan.premium && plan.premiumDailyLimit !== null) {
    const today = utcDay(now);
    const usedToday = grantDates.filter((d) => d === today).length;
    const allowed = usedToday < plan.premiumDailyLimit;
    return { allowed, premium: true, lastExamDate: last, nextAvailableAt: allowed ? null : addDays(today, 1).toISOString() };
  }
  if (last === null) return { allowed: true, premium: false, lastExamDate: null, nextAvailableAt: null };
  return { allowed: false, premium: false, lastExamDate: last, nextAvailableAt: addDays(last, EXAM_WINDOW_DAYS).toISOString() };
}

/**
 * Free or Premium for this account. Reads exam_attempt's premium_daily_limit, then (only
 * when one is set) the service-role has_premium() RPC.
 *
 * Any error reads as the FREE plan, never as Premium and never as a 503: the free rule is
 * always the stricter one, a real DB outage still 503s through loadExamGrantDates, and this
 * keeps POST /score working if this service deploys before migration 20261104230000 (the
 * column would not exist yet).
 */
export async function loadExamPlan(client: Pick<SupabaseClient, 'from' | 'rpc'>, userId: string): Promise<ExamPlan> {
  try {
    const { data, error } = await client
      .from('ai_quota_limits')
      .select('premium_daily_limit')
      .eq('feature', EXAM_ATTEMPT_FEATURE)
      .maybeSingle();
    if (error) throw error;
    const limit = (data as { premium_daily_limit: number | null } | null)?.premium_daily_limit ?? null;
    if (limit === null) return FREE_EXAM_PLAN;
    const premium = await client.rpc('has_premium', { p_user_id: userId });
    if (premium.error) throw premium.error;
    return premium.data === true ? { premium: true, premiumDailyLimit: limit } : FREE_EXAM_PLAN;
  } catch (err) {
    console.warn('[examAllowance] Premium lookup failed; applying the free rule:', err);
    return FREE_EXAM_PLAN;
  }
}

/** The grant id consume_ai_quota writes for (user, feature, key). */
export function examGrantId(userId: string, sessionId: string): string {
  return `${userId}:${EXAM_ATTEMPT_FEATURE}:${sessionId}`;
}

/**
 * UTC dates of the account's exam_attempt grants inside the window, leaving out
 * `excludeSessionId`'s own grant. Throws on a query error: the caller treats that like
 * any other quota-infra failure (503), never as "allowed".
 */
export async function loadExamGrantDates(
  client: Pick<SupabaseClient, 'from'>,
  userId: string,
  now: Date,
  excludeSessionId?: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('ai_usage_grants')
    .select('id, grant_date')
    .eq('user_id', userId)
    .eq('feature', EXAM_ATTEMPT_FEATURE)
    .gte('grant_date', windowStart(now));
  if (error) throw error;
  const own = excludeSessionId ? examGrantId(userId, excludeSessionId) : null;
  return ((data ?? []) as { id: string; grant_date: string }[])
    .filter((row) => row.id !== own)
    .map((row) => String(row.grant_date).slice(0, 10));
}
