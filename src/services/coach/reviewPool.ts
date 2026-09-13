// ── Coach MVP: spaced re-exposure review pool (Phase 4.2 — real SM-2) ──────────
// Standard SM-2 spaced repetition, keyed per question. Entry happens on every
// scored answer (pass or fail) — "review" here means "due for spaced
// repetition," not "you got this wrong." A question that graduates
// (interval > GRADUATION_INTERVAL_DAYS after a pass) is evicted from active
// scheduling; if the learner encounters it again later via ordinary
// unseen/topic-based selection, that creates a brand-new item from scratch —
// there is no "was this graduated before" lookup or permanent exclusion list.

import { getQuestionById } from '../../data/gameData';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { resolveFeatureStatus } from '../../config/featureFlags';
import type { Question } from '../../types';

const REVIEW_POOL_VERSION = 3;

export const INITIAL_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
/** UNVALIDATED — no data yet on the right "stop resurfacing" point for this app. */
export const GRADUATION_INTERVAL_DAYS = 30;

interface ReviewPoolItem {
  questionId: string;
  topicKey: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextEligibleAt: string;
  lastAnsweredAt: string;
  lastQuality: number;
  /** The score on this item's first recorded answer, when known — lets a re-exposure's "did the score improve" be a local comparison, not a guess. */
  firstRecordedScore: number | null;
}

interface ReviewPoolState {
  version: number;
  items: Record<string, ReviewPoolItem>;
}

function emptyState(): ReviewPoolState {
  return { version: REVIEW_POOL_VERSION, items: {} };
}

function readState(): ReviewPoolState {
  const stored = storageGet<ReviewPoolState>(STORAGE_KEYS.reviewPool, emptyState());
  // Corrupt shape or a future/older version — reset rather than trust partial data.
  // No migration attempted — acceptable for a derived, non-authoritative store
  // (matches localCounters.ts's precedent, not coachStorage.ts's rebuild-from-
  // source precedent, since there is no source to rebuild from).
  if (!stored || stored.version !== REVIEW_POOL_VERSION || typeof stored.items !== 'object') {
    return emptyState();
  }
  return stored;
}

function writeState(state: ReviewPoolState): void {
  storageSet(STORAGE_KEYS.reviewPool, state);
}

/**
 * Record the outcome of a scored answer via standard SM-2. Called from
 * sessionOrchestrator's step 9, best-effort, on every scored answer — not
 * just failures.
 *
 * quality = clamp(round(score / 2), 0, 5). UNVALIDATED product hypothesis:
 * this reuses the app's 0-10 score scale rather than a dedicated recall-
 * difficulty rating, which measures a different thing than
 * LANGUAGE_SUCCESS_SCORE's "good enough for topic mastery" threshold.
 *
 * Standard SM-2 update, in order:
 *  - quality < 3 (fail): repetitions -> 0, intervalDays -> 1.
 *  - quality >= 3 (pass): intervalDays computed from the PRE-update
 *    easeFactor/repetitions, then repetitions += 1.
 *  - easeFactor updated last (using the quality just recorded), floored at
 *    MIN_EASE_FACTOR — ease updates on every answer, including failures.
 * If the pass pushes intervalDays past GRADUATION_INTERVAL_DAYS, the item is
 * deleted instead of written back (graduated, not resumed on re-entry).
 */
export function recordReviewOutcome(args: { questionId: string; topicKey: string; score: number }): void {
  if (resolveFeatureStatus('learnSpacedReview') !== 'live') return;

  const state = readState();
  const now = Date.now();
  const existing = state.items[args.questionId];

  const quality = Math.min(5, Math.max(0, Math.round(args.score / 2)));
  const priorEase = existing?.easeFactor ?? INITIAL_EASE_FACTOR;
  const priorRepetitions = existing?.repetitions ?? 0;

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (priorRepetitions === 0) {
      intervalDays = 1;
    } else if (priorRepetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDaysFor(existing) * priorEase);
    }
    repetitions = priorRepetitions + 1;
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    priorEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality >= 3 && intervalDays > GRADUATION_INTERVAL_DAYS) {
    delete state.items[args.questionId];
    writeState(state);
    return;
  }

  state.items[args.questionId] = {
    questionId: args.questionId,
    topicKey: args.topicKey,
    easeFactor,
    intervalDays,
    repetitions,
    nextEligibleAt: new Date(now + intervalDays * 86_400_000).toISOString(),
    lastAnsweredAt: new Date(now).toISOString(),
    lastQuality: quality,
    firstRecordedScore: existing?.firstRecordedScore ?? args.score,
  };

  writeState(state);
}

/** The interval this item was scheduled at on its previous round (pre-update), used to compute the next round's interval. */
function intervalDaysFor(existing: ReviewPoolItem | undefined): number {
  return existing?.intervalDays ?? 1;
}

/**
 * Pure eligibility lookup: the most-overdue eligible question for `topicKey`
 * not already in `seenIds` this session, gated on `Date.now() >=
 * nextEligibleAt`. Returns null when the flag is off, the pool is empty, or
 * nothing qualifies — degrading to "empty pool" is always the fallback,
 * never a throw.
 */
export function getEligibleReviewQuestion(topicKey: string, seenIds: Set<string>): Question | null {
  if (resolveFeatureStatus('learnSpacedReview') !== 'live') return null;

  const state = readState();
  const now = Date.now();

  const candidates = Object.values(state.items)
    .filter(item => item.topicKey === topicKey)
    .filter(item => !seenIds.has(item.questionId))
    .filter(item => now >= new Date(item.nextEligibleAt).getTime())
    .sort((a, b) => new Date(a.nextEligibleAt).getTime() - new Date(b.nextEligibleAt).getTime());

  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const question = getQuestionById(candidate.questionId);
    if (question) return question;
  }

  return null;
}

/**
 * Looks up a pooled item's stored firstRecordedScore for the
 * review_item_answered telemetry event — kept separate from
 * getEligibleReviewQuestion so that function's return type (and its existing
 * call sites) stay untouched.
 */
export function getReviewItemFirstRecordedScore(questionId: string): number | null {
  const state = readState();
  return state.items[questionId]?.firstRecordedScore ?? null;
}
