// ── Coach MVP: spaced re-exposure review pool (Phase 3 Slice E) ────────────────
// Answers exactly one question: "is there an eligible failed question for this
// topic right now?" via a flat interval+cooldown check. This is deliberately
// NOT a spaced-repetition engine — no forgetting curves, no per-item difficulty
// adjustment, no ease factors, no scheduling algorithm beyond the interval and
// cooldown gates below. Phase 6 owns any future real scheduler (SM-2/Leitner/
// etc.); this store's shape must not grow beyond the fields below for Phase 3.

import { getQuestionById } from '../../data/gameData';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { resolveFeatureStatus } from '../../config/featureFlags';
import type { Question } from '../../types';

const REVIEW_POOL_VERSION = 2;

/** UNVALIDATED — same value and reasoning as interventionService.ts's DRILL_COOLDOWN_MS (24h, "avoid drill fatigue"). */
export const REVIEW_MIN_INTERVAL_MS = 24 * 3_600_000;
/** UNVALIDATED — must start at least one other session before a failed question is eligible. */
export const REVIEW_MIN_INTERVENING_SESSIONS = 1;

interface ReviewPoolItem {
  questionId: string;
  topicKey: string;
  failedAt: string;
  attempts: number;
  sessionsSinceFailure: number;
  nextEligibleAt: string;
  /** The score that caused the original (or most recent) failure, when known — lets a re-exposure's "did the score improve" be a local comparison, not a guess. */
  firstFailScore: number | null;
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

/** Record that a question was failed. Called from sessionOrchestrator's step 9, best-effort. */
export function recordReviewFailure(args: { questionId: string; topicKey: string; score?: number }): void {
  if (resolveFeatureStatus('learnSpacedReview') !== 'live') return;

  const state = readState();
  const now = Date.now();
  const existing = state.items[args.questionId];

  state.items[args.questionId] = {
    questionId: args.questionId,
    topicKey: args.topicKey,
    failedAt: new Date(now).toISOString(),
    attempts: (existing?.attempts ?? 0) + 1,
    sessionsSinceFailure: 0,
    nextEligibleAt: new Date(now + REVIEW_MIN_INTERVAL_MS).toISOString(),
    firstFailScore: args.score ?? null,
  };

  writeState(state);
}

/**
 * Called once per new session start (any topic, any mode except Exam — this
 * module is never imported by ExamMode.tsx/scripts/scoring/) to advance the
 * cooldown counter for every pooled item.
 */
export function advanceReviewPoolSessions(): void {
  if (resolveFeatureStatus('learnSpacedReview') !== 'live') return;

  const state = readState();
  for (const item of Object.values(state.items)) {
    item.sessionsSinceFailure += 1;
  }
  writeState(state);
}

/**
 * Pure eligibility lookup: the first eligible failed question for `topicKey`
 * not already in `seenIds` this session. Both gates required:
 *   - sessionsSinceFailure >= REVIEW_MIN_INTERVENING_SESSIONS (never the same
 *     or very next session as the failure)
 *   - Date.now() >= nextEligibleAt (REVIEW_MIN_INTERVAL_MS elapsed)
 * Returns null when the flag is off, the pool is empty, or nothing qualifies —
 * degrading to "empty pool" is always the fallback, never a throw.
 */
export function getEligibleReviewQuestion(topicKey: string, seenIds: Set<string>): Question | null {
  if (resolveFeatureStatus('learnSpacedReview') !== 'live') return null;

  const state = readState();
  const now = Date.now();

  const candidates = Object.values(state.items)
    .filter(item => item.topicKey === topicKey)
    .filter(item => !seenIds.has(item.questionId))
    .filter(item => item.sessionsSinceFailure >= REVIEW_MIN_INTERVENING_SESSIONS)
    .filter(item => now >= new Date(item.nextEligibleAt).getTime())
    .sort((a, b) => new Date(a.failedAt).getTime() - new Date(b.failedAt).getTime());

  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const question = getQuestionById(candidate.questionId);
    if (question) return question;
  }

  return null;
}

/**
 * Looks up a pooled item's stored firstFailScore for the review_item_answered
 * telemetry event — kept separate from getEligibleReviewQuestion so that
 * function's return type (and its existing call sites) stay untouched.
 */
export function getReviewItemFirstFailScore(questionId: string): number | null {
  const state = readState();
  return state.items[questionId]?.firstFailScore ?? null;
}
