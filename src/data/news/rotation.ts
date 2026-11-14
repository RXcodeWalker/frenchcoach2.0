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

/**
 * Pinned days before `day` since 1970 (each pinned 'MM-DD' once a year). The
 * rotation skips them, so a pinned day never swallows a rotation edition: the
 * story due that day runs the next day instead (daily-news §9).
 */
function pinnedDaysBefore(day: string, pins: readonly string[]): number {
  const target = dayNumber(day);
  const year = Number(day.slice(0, 4));
  let count = 0;
  for (const pin of pins) {
    const [m, d] = pin.split('-').map(Number);
    for (let y = 1970; y <= year; y++) {
      const t = Date.UTC(y, m - 1, d);
      if (new Date(t).getUTCMonth() !== m - 1) continue; // 02-29 in a non-leap year
      if (Math.floor(t / DAY_MS) < target) count++;
    }
  }
  return count;
}

/** Position in the rotation for `day`: one step per unpinned day. */
export function rotationIndex(day: string, bank: readonly NewsEdition[]): number {
  const pins = bank.flatMap(e => (e.pinDate ? [e.pinDate] : []));
  return dayNumber(day) - pinnedDaysBefore(day, pins);
}

/**
 * The story for `day` ('YYYY-MM-DD'): a pinned edition for that MM-DD, else the
 * rotation. Rotation editions run in bank order, one per unpinned day, so the
 * parts of a multi-day story (adjacent in the bank) run on consecutive days.
 */
export function editionForDay(day: string, bank: readonly NewsEdition[]): NewsEdition {
  if (bank.length === 0) throw new Error('editionForDay: empty news bank');
  const mmdd = day.slice(5);
  const pinned = bank.find(e => e.pinDate === mmdd);
  if (pinned) return pinned;
  const pool = bank.filter(e => !e.pinDate);
  const list = pool.length > 0 ? pool : bank;
  const n = rotationIndex(day, bank);
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
