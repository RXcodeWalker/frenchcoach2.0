// The Learn review slot's pick from the spaced-review pool (`reviewPool.ts`).
// Kept apart from the pool itself because it needs the full question bank:
// Home and Progress read the pool (due counts) and must not download the bank.

import { getQuestionById } from '../../data/gameData';
import { resolveFeatureStatus } from '../../config/featureFlags';
import type { Question } from '../../types';
import { readState } from './reviewPool';

/**
 * Pure eligibility lookup: the most-overdue eligible question for `topicKey`
 * not already in `seenIds` this session, gated on `Date.now() >=
 * nextEligibleAt`. Returns null when the flag is off, the pool is empty, or
 * nothing qualifies — degrading to "empty pool" is always the fallback,
 * never a throw. `accept` (Learn overhaul Batch 2) lets the caller hold the
 * review slot to the learner's filters: a due item that fails it is skipped,
 * so a filtered session simply has no review slot (docs §8.3).
 */
export function getEligibleReviewQuestion(
  topicKey: string,
  seenIds: Set<string>,
  accept?: (question: Question) => boolean,
): Question | null {
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
    if (question && (!accept || accept(question))) return question;
  }

  return null;
}
