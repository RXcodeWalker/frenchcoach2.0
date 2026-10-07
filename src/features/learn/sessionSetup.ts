// ── One-screen Learn setup — pure helpers. Learn overhaul Batch 2. ───────────────
//
// Length options, how they clamp to the number of questions that match the
// learner's filters, and the live "what will this session be like" preview.
// No React, no storage: the setup screen and Learn.tsx both call these.

import type { SessionMode, Topic } from '../../types';
import { SESSION_TARGET, type BuiltSessionQuestionSlot } from '../../utils/sessionBuilder';
import { levelLabel } from '../../domain/learn/ability/levelLabel';
import { demandScoreToAbilityLevel } from '../../domain/learn/ability/thresholds';

/** The four lengths the setup screen offers, shortest first. "Just one question" is now simply "1". */
export const SETUP_LENGTHS: { mode: SessionMode; count: number }[] = [
  { mode: 'single', count: SESSION_TARGET.single },
  { mode: 'quick', count: SESSION_TARGET.quick },
  { mode: 'standard', count: SESSION_TARGET.standard },
  { mode: 'deep_dive', count: SESSION_TARGET.deep_dive },
];

/**
 * A topic holding fewer questions than the shortest multi-question session (5)
 * can't be practised as a session, so the topic grid hides it (docs §13.4: the
 * eight advanced topics hold one question each).
 */
export const MIN_TOPIC_QUESTIONS = SESSION_TARGET.quick;

export function isTopicVisible(topic: Topic): boolean {
  return topic.questionsCount >= MIN_TOPIC_QUESTIONS;
}

/** A length is offered only when enough questions match to fill it — never padded with non-matching ones. */
export function isLengthAvailable(mode: SessionMode, matchCount: number): boolean {
  return SESSION_TARGET[mode] <= matchCount;
}

/**
 * The length actually used for `chosen`: itself when it fits, otherwise the
 * largest length that does (`clamped: true`, so the screen can say why).
 * `mode: null` when nothing matches at all.
 */
export function clampLength(chosen: SessionMode, matchCount: number): { mode: SessionMode | null; clamped: boolean } {
  if (isLengthAvailable(chosen, matchCount)) return { mode: chosen, clamped: false };
  const fitting = SETUP_LENGTHS.filter((l) => l.count <= matchCount);
  const best = fitting.length > 0 ? fitting[fitting.length - 1].mode : null;
  return { mode: best, clamped: true };
}

export interface SessionPreview {
  total: number;
  /** Questions that stayed `stretch` after selection (a downgraded stretch is already a `target`). */
  stretch: number;
  /** Exam-relative label for today's target level — never a raw score, never B2/C1. */
  targetLabel: string;
}

/**
 * Summarises a dry-run selection (the very `slots` buildSessionQuestions
 * returns) for the Difficulty section. `sessionTarget` is today's
 * `computeSessionTarget(ability, aim)` (docs §6).
 */
export function summarisePreview(
  slots: BuiltSessionQuestionSlot[] | undefined,
  sessionTarget: number,
): SessionPreview | null {
  if (!slots || slots.length === 0) return null;
  return {
    total: slots.length,
    stretch: slots.filter((s) => s.slotType === 'stretch').length,
    targetLabel: levelLabel(demandScoreToAbilityLevel(sessionTarget)),
  };
}

export function previewText(preview: SessionPreview): string {
  const base = `Pitched at ${preview.targetLabel}`;
  return preview.stretch > 0
    ? `${base}, with ${preview.stretch} of ${preview.total} a step above.`
    : `${base}.`;
}
