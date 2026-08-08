/**
 * Shared ISO 8601 week-key util (social layer plan §1.6, §2.1, §3.2). Computes
 * the same value the xp_events.week_key generated column computes in
 * Postgres — entirely in UTC, Monday-start weeks, week 1 = the week
 * containing 4 January (the ISO 8601 definition) — so client-side weekly
 * grouping never disagrees with the DB aggregate it's meant to mirror.
 *
 * Deliberately UTC-only, unlike weeklyReviewService.getCurrentWeekKey() (local
 * getDay()/getFullYear()) and analyticsService.dateKey() (toISOString(), also
 * UTC but a different bucket granularity) — those two already disagree with
 * each other at day/week boundaries for non-UTC users (plan §1.6 hazard).
 * weeklyReviewService should migrate onto this util rather than keep its own
 * copy (plan §5 integration point 4).
 */

/** Format: 'YYYY-Www', e.g. '2026-W32'. */
export function getWeekKey(date: Date = new Date()): string {
  // Standard ISO week algorithm, done purely in UTC fields so it matches
  // extract(isoyear/week FROM occurred_at AT TIME ZONE 'UTC') in Postgres.
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const target = new Date(utcMidnight);

  // ISO weekday: Monday=1 .. Sunday=7 (getUTCDay() is Sunday=0 .. Saturday=6).
  const isoWeekday = target.getUTCDay() === 0 ? 7 : target.getUTCDay();

  // Move to the Thursday of this ISO week — the ISO week's year is defined by
  // whichever calendar year that Thursday falls in.
  target.setUTCDate(target.getUTCDate() - isoWeekday + 4);
  const isoYear = target.getUTCFullYear();

  // Week 1 is the week containing 4 January of isoYear.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Weekday = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const week1Monday = new Date(jan4.getTime());
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Weekday + 1);

  const diffDays = Math.round((target.getTime() - week1Monday.getTime()) / 86400000);
  const isoWeek = Math.floor(diffDays / 7) + 1;

  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}
