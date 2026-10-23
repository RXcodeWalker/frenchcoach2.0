// ── Learn marking level: learner-facing copy and the needs-card view model. ─────
//
// learn-marking §6.1 and §8.3. Pure. All wording for the marking level lives
// here so the cards stay thin and the words are testable. Nothing in this file
// is read by a prompt, a request body, an evidence event or a reward: it only
// decides what the learner is told (ADR 0013 rule 2 — the level stays on the
// device). Coach voice only; the Examiner style never receives a marking level
// and so never shows any of this (ADR 0005).
//
// Learn scores are not Cambridge marks (§1.4): the Exam-standard note says so.

import { isUnscored } from '../../scoring';
import type { FeedbackV2 } from '../../../types';
import type { LadderId, LadderNeed, MarkingLevel, Rung } from './markingLevel';

/** §6.1 — at most this many "needs" items are shown (UNVALIDATED). The backend already caps its list; this is the display's own ceiling. */
export const MAX_NEEDS_SHOWN = 3;

/** §8.3 — no `levelCheck` (kill switch, offline, old backend): the Exam score is shown, and the learner is told. */
export const LEVEL_MARKING_UNAVAILABLE = 'Level marking unavailable — marked at Exam standard';

/** An attempt that was never graded has no score to read at any level. */
export const LEVEL_MARKING_NOT_GRADED = 'Not graded, so your marking level was not applied.';

/** §5 — Exam standard is a per-ladder blend, read at "A2 with elements of B1" (TN p.11–12, paraphrased). */
export const EXAM_STANDARD_NOTE =
  'Exam standard blends A2 and B1, the way the speaking exam does. It is a practice score, not a Cambridge mark.';

const LEVEL_NAMES: Record<MarkingLevel, string> = {
  A1: 'A1',
  A2: 'A2',
  exam: 'Exam standard',
  B1: 'B1',
  B2: 'B2',
};

/** "A1" · "A2" · "Exam standard" · "B1" · "B2" — never the raw `exam` key. */
export function markingLevelName(level: MarkingLevel): string {
  return LEVEL_NAMES[level];
}

/** The caption under a level-marked score: what the answer was checked against. */
export function checkedAgainstLine(level: MarkingLevel): string {
  return level === 'exam' ? 'Checked against Exam standard' : `Checked against the ${level} ladder`;
}

/** The heading of the needs card. */
export function needsHeading(level: MarkingLevel): string {
  return `What your answer needs for ${markingLevelName(level)}`;
}

/** Shown in place of the list when nothing is missing at this level. */
export function meetsLine(level: MarkingLevel): string {
  return `This answer meets ${markingLevelName(level)}`;
}

/** Shown beside a "first step" item: the answer is two or more rungs short on that ladder. */
export const FIRST_STEP_LABEL = 'First step';

export interface NeedsItem {
  ladder: LadderId;
  label: string;
  nextRung: Rung;
  text: string;
  firstStep: boolean;
  /** The model's short example built from the learner's own words; null when there is none worth showing. */
  example: string | null;
}

export type LevelNeedsView =
  /** Nothing to show: ungraded, or no levelCheck (the score line carries the "unavailable" note). */
  | { kind: 'none' }
  /** The answer reaches every rung this level asks for. */
  | { kind: 'meets'; level: MarkingLevel }
  | { kind: 'needs'; level: MarkingLevel; items: NeedsItem[] };

/**
 * §6.1 — the needs card's content for the learner's level. The list is exactly
 * the backend's unreached rungs at that level, in the backend's order
 * (T, O, F, L, A, R). Model-written text is dropped, never rewritten: an item
 * with no text is skipped, and an empty example is shown as no example.
 */
export function buildLevelNeedsView(
  fb: Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'>,
  level: MarkingLevel,
): LevelNeedsView {
  if (isUnscored(fb) || !fb.levelCheck) return { kind: 'none' };
  const raw: readonly LadderNeed[] = fb.levelCheck.needsByLevel[level] ?? [];
  const items: NeedsItem[] = [];
  for (const need of raw) {
    const text = need.text.trim();
    if (!text) continue;
    const example = need.example?.trim() || null;
    items.push({
      ladder: need.ladder,
      label: need.label.trim() || text,
      nextRung: need.nextRung,
      text,
      firstStep: need.firstStep,
      example,
    });
    if (items.length === MAX_NEEDS_SHOWN) break;
  }
  if (items.length > 0) return { kind: 'needs', level, items };
  // Items that all failed the drop filter are not "nothing missing": say nothing rather than claim a pass.
  return raw.length === 0 ? { kind: 'meets', level } : { kind: 'none' };
}
