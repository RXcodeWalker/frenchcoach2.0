/**
 * One sample exam per account per rolling 7 days (launch limit, owner decision 2026-10-24).
 *
 * POST /score charges `exam_attempt` with the exam's sessionId (backend migration
 * 20261025090000). consume_ai_quota counts per UTC day, so the 7-day window is checked
 * here, from the account's exam_attempt grants, before the charge. Grant dates are UTC
 * days, so "7 days" is 7 calendar days: an exam on a Monday unlocks the next one on the
 * following Monday (00:00 UTC). A retry of the same attempt (same sessionId) is never
 * counted against itself.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const EXAM_ATTEMPT_FEATURE = 'exam_attempt';
export const EXAM_WINDOW_DAYS = 7;

export interface ExamAllowance {
  allowed: boolean;
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

/** Pure: the allowance given the UTC grant dates of the account's other exams. */
export function examAllowanceFrom(grantDates: string[], now: Date): ExamAllowance {
  const start = windowStart(now);
  const inWindow = grantDates.filter((d) => d >= start).sort();
  if (inWindow.length === 0) return { allowed: true, lastExamDate: null, nextAvailableAt: null };
  const last = inWindow[inWindow.length - 1];
  return { allowed: false, lastExamDate: last, nextAvailableAt: addDays(last, EXAM_WINDOW_DAYS).toISOString() };
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
