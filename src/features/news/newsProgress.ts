/**
 * Daily News progress, derived from the session history (no store of its own,
 * CLAUDE.md Core Rule 4) — docs/systems/daily-news.md §4.
 *
 * A show is tied to an edition-DAY, not just an edition: stories come back
 * round the rotation, and replaying one weeks later is a new day's news. XP is
 * awarded for the first finished featured segment on an edition-day only; the
 * streak counts consecutive finished days.
 */
import { editionForDay, recentDays } from '../../data/news/rotation';
import type { NewsEdition, NewsLevelId } from '../../data/news/types';
import type { MarkingLevel } from '../../domain/learn/marking/markingLevel';
import { localDayOf } from '../../lib/localDay';

export function newsContentId(editionId: string, day: string): string {
  return `news:${editionId}:${day}`;
}

interface HistoryEntry {
  mode: string;
  contentId?: string;
  /** When the show was finished (ISO); decides whether it counted on its own day. */
  date?: string;
}

function dayOfKey(contentId: string): string | null {
  const day = contentId.slice(contentId.lastIndexOf(':') + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Every edition-day with a finished featured segment. */
export function finishedContentIds(history: readonly HistoryEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const s of history) if (s.mode === 'daily_news' && s.contentId?.startsWith('news:')) ids.add(s.contentId);
  return ids;
}

/**
 * Every day ('YYYY-MM-DD') whose show was finished, read from the day at the
 * end of a `news:<editionId>:<day>` key. Keyed on the day, never the edition
 * id, so adding or reordering editions (which moves the rotation) never takes
 * a learner's ticks or streak away (daily-news §4). Quiz and journal keys use
 * other prefixes and never count.
 */
export function finishedDays(history: readonly HistoryEntry[]): Set<string> {
  const days = new Set<string>();
  for (const id of finishedContentIds(history)) {
    const day = dayOfKey(id);
    if (day) days.add(day);
  }
  return days;
}

/**
 * Days finished ON that day — what the streak counts (daily-news §6). An
 * archive catch-up ticks its day in the week strip but never mends a streak.
 * An entry with no date (older history) is trusted.
 */
function streakDays(history: readonly HistoryEntry[]): Set<string> {
  const days = new Set<string>();
  for (const s of history) {
    if (s.mode !== 'daily_news' || !s.contentId?.startsWith('news:')) continue;
    const day = dayOfKey(s.contentId);
    if (day && (!s.date || localDayOf(s.date) === day)) days.add(day);
  }
  return days;
}

/** True when the first finished show on this edition-day is still to come (so it earns XP). */
export function earnsXp(history: readonly HistoryEntry[], contentId: string): boolean {
  return !finishedContentIds(history).has(contentId);
}

/** Consecutive days finished on the day, ending today. Today not done yet doesn't break it: the count then ends yesterday. */
export function newsStreak(history: readonly HistoryEntry[], today: string): number {
  const done = streakDays(history);
  const days = recentDays(today, 366);
  let i = done.has(today) ? 0 : 1;
  let count = 0;
  for (; i < days.length; i++) {
    if (!done.has(days[i])) break;
    count++;
  }
  return count;
}

export interface NewsDay {
  day: string;
  edition: NewsEdition;
  done: boolean;
}

/** The last `count` days, oldest first, each with its edition and whether it was finished. */
export function newsDays(history: readonly HistoryEntry[], today: string, bank: readonly NewsEdition[], count: number): NewsDay[] {
  const done = finishedDays(history);
  return recentDays(today, count)
    .reverse()
    .map(day => ({ day, edition: editionForDay(day, bank), done: done.has(day) }));
}

/** The default story level for a learner's Learn marking level (learn-marking §1). */
export function defaultNewsLevel(marking: MarkingLevel): NewsLevelId {
  if (marking === 'A1' || marking === 'A2') return 'a2';
  if (marking === 'B2') return 'b2';
  return 'b1';
}

export function isNewsLevel(value: unknown): value is NewsLevelId {
  return value === 'a2' || value === 'b1' || value === 'b2';
}
