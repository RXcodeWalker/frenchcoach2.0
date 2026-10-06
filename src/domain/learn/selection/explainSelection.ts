// ── explainSelection — docs §14 UX #2 "Why this question?". Pure. ──────────────
//
// Learn overhaul Batch 1d. The text comes from the slot, the escalation-ladder
// rung that filled it (docs §8.3), and the question's real level compared with
// today's target — never from the slot type alone. Rung 0 can still hit far
// outside the band (the other score terms keep a candidate above zero), so the
// level comparison is what decides whether "at your level" is true.
// Never shows belief math, scores, CEFR codes or raw demand ids (docs §14).

import type { SlotType } from './types';

/** Same half-width as planSlots' `target` band (T−0.5 … T+0.5). */
const AT_LEVEL_HALF_WIDTH = 0.5;

/** Rung ≥ 2 means the band no longer shaped the pick (docs §8.3). */
const BAND_DROPPED_RUNG = 2;

export interface ExplainSelectionArgs {
  slot: SlotType;
  /** docs §8.3 ladder rung: 0 band as planned · 1 widened · 2 band dropped · 3 seen allowed · 4 no demands. */
  rung: number;
  /** deriveDemandScore(question.demands), or null when the question has no demands. */
  questionLevel: number | null;
  /** Today's sessionTarget, or null when the caller doesn't know it. */
  targetLevel: number | null;
}

type Position = 'below' | 'at' | 'above';

function positionOf(questionLevel: number, targetLevel: number): Position {
  const diff = questionLevel - targetLevel;
  if (diff < -AT_LEVEL_HALF_WIDTH) return 'below';
  if (diff > AT_LEVEL_HALF_WIDTH) return 'above';
  return 'at';
}

export function explainSelection({ slot, rung, questionLevel, targetLevel }: ExplainSelectionArgs): string {
  if (slot === 'review') {
    return 'Due for a spaced review — coming back to a question after a gap helps it stick.';
  }
  if (slot === 'choice') {
    return 'A change of pace to keep things varied.';
  }
  if (questionLevel === null) {
    return "Picked from what's left in this topic — this question isn't graded for level yet.";
  }
  if (targetLevel === null) {
    return slot === 'warmup' ? 'A question to get you started.' : "Picked for today's practice.";
  }

  const position = positionOf(questionLevel, targetLevel);
  const closestLeft = rung >= BAND_DROPPED_RUNG ? ' — the closest match left in this topic' : '';

  if (slot === 'stretch') {
    return position === 'above'
      ? "A step above today's level, to stretch you."
      : "Close to today's level — no harder checked question fitted today.";
  }

  if (slot === 'warmup') {
    if (position === 'below') return `An easier question to start with a win${closestLeft}.`;
    return position === 'above'
      ? `A little harder than a usual warm-up${closestLeft}.`
      : `A question close to today's level to get going${closestLeft}.`;
  }

  // target
  if (position === 'at') {
    return rung < BAND_DROPPED_RUNG ? 'Right at your level today.' : `Close to today's level${closestLeft}.`;
  }
  return position === 'below'
    ? `A little easier than today's level${closestLeft}.`
    : `A little harder than today's level${closestLeft}.`;
}
