/**
 * Pronunciation Lab — the monthly check's results and trend (pronunciation-lab
 * plan §3.3 "Monthly check", §3.4). Pure.
 *
 * Honest progress means the same measurement each time: the same five sentences
 * (`benchmark.ts`), counted the same way (the first usable take of each
 * sentence), under the same cut-offs. So a trend is shown only between two
 * checks taken under the same `BENCHMARK_VERSION` and `LAB_THRESHOLDS_VERSION`,
 * and only over the sentences both checks measured (`MIN_COMPARABLE_SENTENCES`).
 * The only number a check ever produces is "N of M words clear" (owner D5).
 */

import { BENCHMARK_SENTENCES, BENCHMARK_VERSION } from './benchmark';
import { LAB_THRESHOLDS_VERSION } from './thresholds';
import { isDay } from './days';
import type { LabTake } from './wordStates';

/** One benchmark sentence's counted take. */
export interface CheckSentenceResult {
  /** Index into `BENCHMARK_SENTENCES`. */
  index: number;
  wordsClear: number;
  wordsTotal: number;
}

export interface MonthlyCheckResult {
  /** The learner's local calendar day it was finished, YYYY-MM-DD. */
  day: string;
  benchmarkVersion: string;
  thresholdsVersion: string;
  /** The sentences that could be measured, in order. Fewer than five when one couldn't be checked. */
  sentences: CheckSentenceResult[];
}

/** A comparison needs at least this many sentences measured in both checks. Product decision. */
export const MIN_COMPARABLE_SENTENCES = 3;
/** A check with fewer measured sentences than this isn't saved (it would say almost nothing). Product decision. */
export const MIN_SAVED_SENTENCES = 3;

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function sanitizeCheck(raw: unknown): MonthlyCheckResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (!isDay(c.day) || typeof c.benchmarkVersion !== 'string' || typeof c.thresholdsVersion !== 'string' || !Array.isArray(c.sentences)) return null;
  const sentences: CheckSentenceResult[] = [];
  for (const s of c.sentences) {
    if (typeof s !== 'object' || s === null) return null;
    const { index, wordsClear, wordsTotal } = s as Record<string, unknown>;
    if (!Number.isInteger(index) || !Number.isInteger(wordsClear) || !Number.isInteger(wordsTotal)) return null;
    const i = index as number;
    const clear = wordsClear as number;
    const total = wordsTotal as number;
    if (i < 0 || total < 1 || clear < 0 || clear > total) return null;
    sentences.push({ index: i, wordsClear: clear, wordsTotal: total });
  }
  return { day: c.day, benchmarkVersion: c.benchmarkVersion, thresholdsVersion: c.thresholdsVersion, sentences };
}

/**
 * What one sentence's take counts as: the first take that could give word
 * states. A take that was refused (not Azure, couldn't assess) or never made
 * is not measured — the check says so rather than counting it as zero.
 */
export function sentenceResult(index: number, take: LabTake | null): CheckSentenceResult | null {
  if (!take || take.refused !== null || take.counts.total < 1) return null;
  return { index, wordsClear: take.counts.clear, wordsTotal: take.counts.total };
}

/** The result to save, or null when too few sentences were measured to be worth keeping. */
export function buildCheckResult(results: ReadonlyArray<CheckSentenceResult | null>, day: string): MonthlyCheckResult | null {
  const sentences = results.filter((r): r is CheckSentenceResult => r !== null);
  if (sentences.length < MIN_SAVED_SENTENCES) return null;
  return { day, benchmarkVersion: BENCHMARK_VERSION, thresholdsVersion: LAB_THRESHOLDS_VERSION, sentences };
}

export function totals(sentences: readonly CheckSentenceResult[]): { clear: number; total: number } {
  return sentences.reduce((t, s) => ({ clear: t.clear + s.wordsClear, total: t.total + s.wordsTotal }), { clear: 0, total: 0 });
}

/** A check is due when none was finished in the current calendar month. */
export function isCheckDue(checks: readonly MonthlyCheckResult[], today: string): boolean {
  return !checks.some((c) => monthOf(c.day) === monthOf(today));
}

/** The most recent check, whichever versions it was taken under. */
export function latestCheck(checks: readonly MonthlyCheckResult[]): MonthlyCheckResult | null {
  return checks.length > 0 ? checks[checks.length - 1] : null;
}

export interface CheckTrend {
  /** The earlier and later check days. */
  fromDay: string;
  toDay: string;
  /** The sentences both measured, so the two counts are over the same words (the sentences' own word totals). */
  sentences: number;
  before: { clear: number; total: number };
  after: { clear: number; total: number };
}

/**
 * Latest check against the one before it, over the sentences both measured —
 * only when both used the same benchmark and cut-offs and the word totals of
 * every shared sentence agree. Null when there is nothing honest to compare
 * (fewer than two checks, a version change, or too few shared sentences).
 */
export function checkTrend(checks: readonly MonthlyCheckResult[]): CheckTrend | null {
  if (checks.length < 2) return null;
  const after = checks[checks.length - 1];
  const before = checks[checks.length - 2];
  if (before.benchmarkVersion !== after.benchmarkVersion || before.thresholdsVersion !== after.thresholdsVersion) return null;
  const beforeBy = new Map(before.sentences.map((s) => [s.index, s]));
  const shared: Array<[CheckSentenceResult, CheckSentenceResult]> = [];
  for (const s of after.sentences) {
    const b = beforeBy.get(s.index);
    if (b && b.wordsTotal === s.wordsTotal && s.index < BENCHMARK_SENTENCES.length) shared.push([b, s]);
  }
  if (shared.length < MIN_COMPARABLE_SENTENCES) return null;
  return {
    fromDay: before.day,
    toDay: after.day,
    sentences: shared.length,
    before: totals(shared.map(([b]) => b)),
    after: totals(shared.map(([, a]) => a)),
  };
}
