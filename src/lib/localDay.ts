/**
 * What a "day" is for the learner: their own local calendar day (the device's
 * timezone), YYYY-MM-DD. Owner decision 2026-11-04 — midnight where the learner
 * is, not midnight UTC (UTC midnight is 05:30 in India, so a 1 a.m. session used
 * to count for the day before). Streaks, the daily goal ring, daily stats, the
 * coach's daily plan and the practice heatmap all use this.
 *
 * NOT for server-enforced or shared days: the AI usage limits and the exam's
 * rolling 7 days are counted by the server in UTC, and the Daily Challenge is
 * one set for everyone per UTC day.
 */
export function localDay(date: Date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The local day `days` before `from` (calendar arithmetic, safe across DST changes). */
export function localDayBefore(days: number, from: Date = new Date()): string {
  return localDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() - days, 12));
}

/** The local day a stored ISO timestamp fell on ('' when it does not parse). */
export function localDayOf(iso: string): string {
  const t = new Date(iso);
  return Number.isFinite(t.getTime()) ? localDay(t) : '';
}
