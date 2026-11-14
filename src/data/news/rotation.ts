/**
 * Which edition runs on a given local day — docs/systems/daily-news.md §2.
 *
 * Pure and deterministic: the same day gives the same edition on every device,
 * with no network. A day is the learner's local calendar day (lib/localDay.ts),
 * so the edition changes at the learner's midnight, not UTC's.
 */
import type { NewsEdition } from './types';

const DAY_MS = 86_400_000;

/** Whole days from 1970-01-01 to `day` ('YYYY-MM-DD'), timezone-free. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / DAY_MS);
}

/** The story for `day` ('YYYY-MM-DD'): a pinned edition for that MM-DD, else the rotation. */
export function editionForDay(day: string, bank: readonly NewsEdition[]): NewsEdition {
  if (bank.length === 0) throw new Error('editionForDay: empty news bank');
  const mmdd = day.slice(5);
  const pinned = bank.find(e => e.pinDate === mmdd);
  if (pinned) return pinned;
  const pool = bank.filter(e => !e.pinDate);
  const list = pool.length > 0 ? pool : bank;
  const n = dayNumber(day);
  return list[((n % list.length) + list.length) % list.length];
}

/** Local day keys, newest first: today and the `count - 1` days before it. */
export function recentDays(today: string, count: number): string[] {
  const base = dayNumber(today);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date((base - i) * DAY_MS);
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}
