/**
 * Daily News progress, derived from the session history (no store of its own,
 * CLAUDE.md Core Rule 4) — docs/systems/daily-news.md §4.
 *
 * A report is tied to an edition-DAY, not just an edition: stories come back
 * round the rotation, and replaying one weeks later is a new day's news. XP is
 * awarded for the first finished report on an edition-day only; the streak
 * counts consecutive days whose own edition was finished.
 */
import { editionForDay, recentDays } from '../../data/news/rotation';
import type { NewsEdition, NewsLevelId } from '../../data/news/types';
import type { MarkingLevel } from '../../domain/learn/marking/markingLevel';

export function newsContentId(editionId: string, day: string): string {
  return `news:${editionId}:${day}`;
}

interface HistoryEntry {
  mode: string;
  contentId?: string;
}

/** Every edition-day with a finished report. */
export function finishedContentIds(history: readonly HistoryEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const s of history) if (s.mode === 'daily_news' && s.contentId) ids.add(s.contentId);
  return ids;
}

/** True when the first report on this edition-day is still to come (so it earns XP). */
export function earnsXp(history: readonly HistoryEntry[], contentId: string): boolean {
  return !finishedContentIds(history).has(contentId);
}

/**
 * Consecutive days, ending today, whose own edition was finished on that
 * day's key. Today not done yet doesn't break it: the count then ends yesterday.
 */
export function newsStreak(history: readonly HistoryEntry[], today: string, bank: readonly NewsEdition[]): number {
  const done = finishedContentIds(history);
  const days = recentDays(today, 366);
  let i = done.has(newsContentId(editionForDay(today, bank).id, today)) ? 0 : 1;
  let count = 0;
  for (; i < days.length; i++) {
    const d = days[i];
    if (!done.has(newsContentId(editionForDay(d, bank).id, d))) break;
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
  const done = finishedContentIds(history);
  return recentDays(today, count)
    .reverse()
    .map(day => {
      const edition = editionForDay(day, bank);
      return { day, edition, done: done.has(newsContentId(edition.id, day)) };
    });
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

/**
 * The report's practice score, 0–10: half listening comprehension, half facts
 * retold. It drives Session.score and XP for this mode only (daily-news §4);
 * the AI feedback's own language/fluency scores are never overwritten.
 */
export function newsScore(checkCorrect: number, checkTotal: number, factsCovered: number, factsTotal: number): number {
  const c = checkTotal > 0 ? checkCorrect / checkTotal : 0;
  const f = factsTotal > 0 ? factsCovered / factsTotal : 0;
  return Math.round((c * 0.5 + f * 0.5) * 100) / 10;
}
