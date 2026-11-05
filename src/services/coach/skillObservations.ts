// ── EvidenceEvent → SkillObservation (learner-model §3) ────────────────────────
//
// The ONE conversion from the evidence log to the learner model, used both by
// live ingest (AppContext's appendEvidenceEvents listener) and by the first-run
// bootstrap (replaying the log). Weights are the reducer's own base weights
// (reliability × evaluator cap × source weight), so inferred demand events stay
// ≈ 0.26 and reviewed ≈ 0.41. The reliability gate applies to the BASE weight
// here, never after decay (the gate fix: an event fades, it does not expire).
//
// Pure apart from the optional review-pool lookup the caller injects.

import type { EvidenceEvent } from '../../types/evidence';
import type { SkillObservation } from '../../domain/learnerModel/types';
import { LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';
import { computeBaseEventWeight, MIN_RELIABLE_WEIGHT } from './beliefReducer';

const DAY_MS = 86_400_000;

/**
 * A pass on a spaced-review item after at least this many days counts ×1.25:
 * remembering after a gap is stronger retention evidence. A fail keeps ×1.0.
 * UNVALIDATED (no data yet on the right gap or multiplier for this app).
 */
export const REVIEW_GAP_MIN_DAYS = 6;
export const REVIEW_PASS_MULTIPLIER = 1.25;

/** What the converter needs from a review-pool item (reviewPool.ts ReviewPoolItem). */
export interface ReviewItemLookup {
  nextEligibleAt: string;
  lastAnsweredAt: string;
}

/** Idempotency key: the same event re-dispatched or replayed is one observation. */
export function observationIdFor(event: Pick<EvidenceEvent, 'id' | 'occurredAt'>): string {
  return `${event.id}@${event.occurredAt}`;
}

/**
 * Days since the item was last answered, when this answer filled a review slot
 * — i.e. the question was in the SM-2 pool and due (eligible for the review
 * slot) at the time of the answer. null otherwise.
 */
export function retrievalGapDays(at: number, item: ReviewItemLookup | undefined): number | null {
  if (!item) return null;
  const due = Date.parse(item.nextEligibleAt);
  const last = Date.parse(item.lastAnsweredAt);
  if (!Number.isFinite(due) || !Number.isFinite(last) || due > at) return null;
  return Math.max(0, (at - last) / DAY_MS);
}

/** Pure: one event's observation, or null when the reducer would have counted nothing. */
export function observationFromEvent(
  event: EvidenceEvent,
  getReviewItem?: (questionId: string) => ReviewItemLookup | undefined,
): SkillObservation | null {
  if (event.targetNodeIds.length === 0) return null;
  const at = Date.parse(event.occurredAt);
  if (!Number.isFinite(at)) return null;
  const base = computeBaseEventWeight(event);
  if (!(base > 0)) return null;

  if (event.evidenceType === 'behavior') {
    // Avoidance is always counted, as in the reducer (no reliability gate).
    return { id: observationIdFor(event), skillIds: [...event.targetNodeIds], at, kind: 'avoidance', weight: base };
  }
  if (event.evidenceType !== 'language') return null;
  if (base < MIN_RELIABLE_WEIGHT) return null;

  const hasSuccessSignal = event.result.success !== undefined || event.result.score !== undefined;
  const isSuccess =
    event.result.success !== undefined
      ? event.result.success
      : (event.result.score ?? 0) >= LANGUAGE_SUCCESS_SCORE;

  let weight = base;
  const questionId = event.context.questionId;
  if (hasSuccessSignal && isSuccess && questionId && getReviewItem) {
    const gap = retrievalGapDays(at, getReviewItem(questionId));
    if (gap !== null && gap >= REVIEW_GAP_MIN_DAYS) weight = base * REVIEW_PASS_MULTIPLIER;
  }

  return {
    id: observationIdFor(event),
    skillIds: [...event.targetNodeIds],
    at,
    kind: 'outcome',
    ...(hasSuccessSignal ? { success: isSuccess ? 1 : 0 } : {}),
    weight,
  };
}

/** Pure: a batch of events' observations. */
export function observationsFromEvents(
  events: readonly EvidenceEvent[],
  getReviewItem?: (questionId: string) => ReviewItemLookup | undefined,
): SkillObservation[] {
  const out: SkillObservation[] = [];
  for (const e of events) {
    const o = observationFromEvent(e, getReviewItem);
    if (o) out.push(o);
  }
  return out;
}
