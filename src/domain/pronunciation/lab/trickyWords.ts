/**
 * Pronunciation Lab — tricky words (pronunciation-lab plan §3.3 "Tricky words").
 * Pure: no storage, no clock (the caller passes the local day, YYYY-MM-DD).
 *
 * A word becomes "tricky" once it has been "Practise this" in two Lab checks
 * (a sentence take, or a failed one-word drill). It stays on the deck, and
 * re-surfaces, until it has been Clear on two different days with nothing worse
 * in between, then it leaves the deck as "cleared". Saying it again on the
 * same day never counts twice.
 *
 *  - `almost` is neutral: it is neither a second miss nor a break in a run of
 *    clear days (the owner's learners are strongly accented; an in-between
 *    reading is where accent lives, plan §5.1).
 *  - `missed` ("Not heard") and `unknown` are not evidence about the word.
 *  - A cleared word that is Practise again twice becomes tricky again.
 *
 * These counts are product rules, like the per-sitting take caps in
 * `labPracticeState.ts`, not measurements: they are not in `thresholds.ts` and
 * need no calibration or version bump.
 */

export const TRICKY_RULES = {
  /** "Practise this" this many times and the word joins the deck. */
  practiseToJoin: 2,
  /** Clear on this many different days in a row and the word leaves it. */
  clearDaysToLeave: 2,
  /** A word seen "Practise this" once and never again is forgotten after this many days. */
  watchingExpiryDays: 30,
  /** The most words kept (cleared ones go first, then the least recent). */
  maxWords: 200,
} as const;

export type TrickyStatus = 'watching' | 'tricky' | 'cleared';

export interface TrickyEntry {
  status: TrickyStatus;
  /** "Practise this" results since the word last cleared. */
  practiseCount: number;
  /** Consecutive different days the word was Clear. */
  clearRun: number;
  /** The last day the word was checked as Practise or Clear. */
  lastDay: string;
  /** The last day it was Clear; null if never. */
  lastClearDay: string | null;
}

export type TrickyEntries = Record<string, TrickyEntry>;

/** What one check says about a word; `almost` / `missed` / `unknown` are not passed in. */
export type WordEvidence = 'practise' | 'clear';

/** A word's key: lowercase, trimmed. (Callers pass `normalizeWord` output.) */
export function trickyKey(word: string): string {
  return word.normalize('NFC').trim().toLowerCase();
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days from `from` to `to` (YYYY-MM-DD); NaN if either is not a day. */
export function daysBetween(from: string, to: string): number {
  if (!DAY.test(from) || !DAY.test(to)) return Number.NaN;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The learner's local calendar day, YYYY-MM-DD. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The entries after one check of `word`. Returns the same object when nothing changes. */
export function noteWord(entries: TrickyEntries, word: string, evidence: WordEvidence, day: string): TrickyEntries {
  const key = trickyKey(word);
  if (!key) return entries;
  const entry = entries[key];

  if (evidence === 'practise') {
    if (!entry || entry.status === 'cleared') {
      return { ...entries, [key]: { status: 'watching', practiseCount: 1, clearRun: 0, lastDay: day, lastClearDay: entry?.lastClearDay ?? null } };
    }
    const practiseCount = entry.practiseCount + 1;
    return {
      ...entries,
      [key]: {
        ...entry,
        status: practiseCount >= TRICKY_RULES.practiseToJoin ? 'tricky' : 'watching',
        practiseCount,
        clearRun: 0,
        lastDay: day,
      },
    };
  }

  // evidence === 'clear'
  if (!entry || entry.status !== 'tricky') return entries;
  if (entry.lastClearDay === day) return entries;
  const clearRun = entry.clearRun + 1;
  const leaves = clearRun >= TRICKY_RULES.clearDaysToLeave;
  return {
    ...entries,
    [key]: {
      status: leaves ? 'cleared' : 'tricky',
      practiseCount: leaves ? 0 : entry.practiseCount,
      clearRun,
      lastDay: day,
      lastClearDay: day,
    },
  };
}

/** Forgets stale "watching" words and keeps at most `maxWords`. */
export function pruneEntries(entries: TrickyEntries, today: string): TrickyEntries {
  const kept = Object.entries(entries).filter(([, e]) => {
    if (e.status !== 'watching') return true;
    const age = daysBetween(e.lastDay, today);
    return !(age > TRICKY_RULES.watchingExpiryDays);
  });
  if (kept.length <= TRICKY_RULES.maxWords) {
    return kept.length === Object.keys(entries).length ? entries : Object.fromEntries(kept);
  }
  const rank = (e: TrickyEntry) => (e.status === 'cleared' ? 0 : e.status === 'watching' ? 1 : 2);
  kept.sort(([, a], [, b]) => rank(b) - rank(a) || (a.lastDay < b.lastDay ? 1 : a.lastDay > b.lastDay ? -1 : 0));
  return Object.fromEntries(kept.slice(0, TRICKY_RULES.maxWords));
}

export interface DeckWord {
  word: string;
  /** Not yet checked today: it is its turn again. */
  due: boolean;
  /** Clear days in a row so far (0 or 1 while it is on the deck). */
  clearRun: number;
}

/**
 * The deck: tricky words, those not yet practised today first, then the ones
 * missed most, then alphabetical (so the order is stable).
 */
export function trickyDeck(entries: TrickyEntries, today: string): DeckWord[] {
  return Object.entries(entries)
    .filter(([, e]) => e.status === 'tricky')
    .map(([word, e]) => ({ word, due: e.lastDay < today, clearRun: e.clearRun, practiseCount: e.practiseCount }))
    .sort((a, b) => Number(b.due) - Number(a.due) || b.practiseCount - a.practiseCount || a.word.localeCompare(b.word, 'fr'))
    .map(({ word, due, clearRun }) => ({ word, due, clearRun }));
}

/** Words that have left the deck (for "N words cleared"). */
export function clearedCount(entries: TrickyEntries): number {
  return Object.values(entries).filter((e) => e.status === 'cleared').length;
}
