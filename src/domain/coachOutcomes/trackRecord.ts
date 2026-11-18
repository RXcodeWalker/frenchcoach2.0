// ── A coach move's track record, read from the outcome log (pure) ────────────────
//
// decideCoachBrief asks one question of the log per candidate move: "the last
// times the learner actually did this, did the metric it targets go up?"
//
//   • stalls — followed episodes, measured, whose metric did NOT rise by at
//     least IMPROVED_BY since the last one that did. STALLS_BEFORE_SWITCH of
//     them and the coach lowers the move and tries the next strategy for that
//     weakness (coachBrain.ts's STRATEGY_LADDERS).
//   • improvement — when the latest followed, measured episode did rise, the
//     metric from the first followed episode's baseline to the latest outcome.
//     Both numbers are copied from the log; nothing is estimated. When the two
//     don't differ by IMPROVED_BY, there is no improvement to state.
//
// Only followed episodes count (an ignored move proves nothing about the
// move), and only measured ones with a delta (an exam area whose max changed,
// or a topic with no average yet, has none). Ids and numbers only.
//
// UNVALIDATED: every threshold below is a starting guess, not fitted to any
// learner data — there is no outcome dataset yet. Revisit once the log has
// enough episodes to compare followed and ignored moves.

import type { CoachOutcomeEntry, CoachOutcomeLog, MoveTarget, OutcomeBaseline } from './outcomeLog';
import type { CoachMoveKind } from './types';

/**
 * UNVALIDATED. The smallest rise that counts as "the metric improved", per
 * metric: mastery share (0–1), exam-area marks, total /40, topic average /10.
 */
export const IMPROVED_BY: Record<OutcomeBaseline['type'], number> = {
  skill_mastery: 0.05,
  exam_area: 1,
  exam_total: 2,
  topic_average: 0.5,
};

/** UNVALIDATED. Followed-without-improving episodes before the coach switches strategy. */
export const STALLS_BEFORE_SWITCH = 2;

export type TrackImprovement =
  | { metric: 'skill_mastery'; from: number; to: number }
  | { metric: 'exam_area'; from: number; to: number; max: number }
  | { metric: 'exam_total'; from: number; to: number }
  | { metric: 'topic_average'; from: number; to: number };

export interface MoveTrackRecord {
  /** Followed, measured episodes since the last improvement (all of them when none improved). */
  stalls: number;
  /** Followed, measured episodes in all. */
  followedMeasured: number;
  /** Set only when the latest followed episode improved — the numbers to quote. */
  improvement: TrackImprovement | null;
}

export const EMPTY_TRACK_RECORD: MoveTrackRecord = { stalls: 0, followedMeasured: 0, improvement: null };

function sameTarget(a: MoveTarget, b: MoveTarget): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'skill': return a.skillId === (b as typeof a).skillId;
    case 'exam_area': return a.area === (b as typeof a).area;
    case 'topic': return a.topicKey === (b as typeof a).topicKey;
    default: return true;
  }
}

function baselineValue(b: OutcomeBaseline): number | null {
  switch (b.type) {
    case 'skill_mastery': return b.value;
    case 'exam_area': return b.mark;
    case 'exam_total': return b.value;
    case 'topic_average': return b.value;
  }
}

interface Scored {
  entry: CoachOutcomeEntry;
  baseline: OutcomeBaseline;
  value: number;
  delta: number;
}

/** Followed episodes of this move with a measured value and delta, oldest first. */
function scoredEpisodes(log: CoachOutcomeLog, kind: CoachMoveKind, target: MoveTarget): Scored[] {
  const out: Scored[] = [];
  for (const e of log.entries) {
    if (e.kind !== kind || !sameTarget(e.target, target)) continue;
    if (e.follow.status !== 'followed' || e.outcome.status !== 'measured' || !e.baseline) continue;
    const { value, delta } = e.outcome;
    if (value === null || delta === null) continue;
    out.push({ entry: e, baseline: e.baseline, value, delta });
  }
  return out.sort((a, b) => new Date(a.entry.shownAt).getTime() - new Date(b.entry.shownAt).getTime());
}

export function moveTrackRecord(log: CoachOutcomeLog | undefined, kind: CoachMoveKind, target: MoveTarget): MoveTrackRecord {
  if (!log || target.type === 'none') return EMPTY_TRACK_RECORD;
  const eps = scoredEpisodes(log, kind, target);
  if (eps.length === 0) return EMPTY_TRACK_RECORD;
  const threshold = IMPROVED_BY[eps[0].baseline.type];
  let stalls = 0;
  for (const ep of eps) stalls = ep.delta >= threshold ? 0 : stalls + 1;
  const last = eps[eps.length - 1];
  return { stalls, followedMeasured: eps.length, improvement: last.delta >= threshold ? improvementOf(eps, threshold) : null };
}

function improvementOf(eps: Scored[], threshold: number): TrackImprovement | null {
  const first = eps[0].baseline;
  const last = eps[eps.length - 1];
  const from = baselineValue(first);
  if (from === null || last.baseline.type !== first.type) return null;
  const to = last.value;
  if (to - from < threshold) return null;
  switch (first.type) {
    case 'exam_area': {
      // Every episode must be on the same scale, or "from 4 to 7" mixes maxima.
      if (eps.some(ep => ep.baseline.type !== 'exam_area' || ep.baseline.max !== first.max)) return null;
      return { metric: 'exam_area', from, to, max: first.max };
    }
    case 'skill_mastery': return { metric: 'skill_mastery', from, to };
    case 'exam_total': return { metric: 'exam_total', from, to };
    case 'topic_average': return { metric: 'topic_average', from, to };
  }
}
