// ── Learn marking level — learn-marking §1.1, §5, §8. Pure. ─────────────────────
//
// The learner's marking level (A1 · A2 · Exam standard · B1 · B2) never leaves the
// device and never reaches a prompt (ADR 0013 rule 2). The backend computes the
// sub-scores at all five levels in one call (`levelCheck.subScoresByLevel`); this
// module only picks which precomputed result the learner sees and earns.
//
// `fb.scores` stays the Exam-standard result, so every existing reader of the
// score (Session.score, mastery, unlock, SM-2 review, mid-session adjust, belief
// evidence, coach profile, sync, notebook offer) is unaffected by the level
// (§8.1). Only display and rewards read `markedScore` (§8.2).

import { computeOverall, isUnscored } from '../../scoring';
import type { FeedbackV2 } from '../../../types';

export type MarkingLevel = 'A1' | 'A2' | 'exam' | 'B1' | 'B2';

/** Lowest to highest requirement — the order scores are guaranteed to fall in (§6.6). */
export const MARKING_LEVELS: readonly MarkingLevel[] = ['A1', 'A2', 'exam', 'B1', 'B2'];

export const DEFAULT_MARKING_LEVEL: MarkingLevel = 'exam';

/** The request field Learn sends to opt into the ladder (§8.1). Never the level itself. */
export const LEARN_MARKING_SCHEME = 'ladder-v1' as const;
export type LearnMarkingScheme = typeof LEARN_MARKING_SCHEME;

export function isMarkingLevel(value: unknown): value is MarkingLevel {
  return typeof value === 'string' && (MARKING_LEVELS as readonly string[]).includes(value);
}

/**
 * §8.2 owner decision (2026-10-18): below Exam standard an answer earns no bonus
 * XP or gems, and no score achievement or answer-streak credit.
 */
export function markingLevelEarnsBonus(level: MarkingLevel): boolean {
  return MARKING_LEVELS.indexOf(level) >= MARKING_LEVELS.indexOf('exam');
}

// ── levelCheck — the backend's ladder result (§7), validated in feedbackSchema.ts ──

export type LadderId = 'T' | 'L' | 'O' | 'F' | 'R' | 'A';
export type Rung = 'A1' | 'A2' | 'B1' | 'B2';

/** One level's four sub-scores, unrounded (§6 step 3): comm = T/O/F, fluency = L, know = R, acc = A. */
export interface LadderSubScores {
  comm: number;
  fluency: number;
  know: number;
  acc: number;
}

/** One "What your answer needs for <level>" item (§6.1). Rendered by the needs card (Batch 4). */
export interface LadderNeed {
  ladder: LadderId;
  label: string;
  nextRung: Rung;
  text: string;
  firstStep: boolean;
  example: string | null;
}

export interface LevelCheck {
  scheme: LearnMarkingScheme;
  ladderVersion: string;
  applies: LadderId[];
  reached: Partial<Record<LadderId, Rung | 'none'>>;
  subScoresByLevel: Record<MarkingLevel, LadderSubScores>;
  needsByLevel: Record<MarkingLevel, LadderNeed[]>;
}

// ── markedScore (§8.2) ───────────────────────────────────────────────────────────

export interface MarkedScore {
  /** The score shown and rewarded; null when the attempt was never graded. */
  score: number | null;
  /** The level `score` is actually at: the chosen one, or `exam` on the fallback. */
  level: MarkingLevel;
  /** False when there is no `levelCheck` (kill switch, offline, old backend): `score` is the Exam score (§8.3). */
  levelMarked: boolean;
  /** Whether `score` may earn bonus XP, gems, score achievements and streak credit. */
  earnsBonus: boolean;
}

/**
 * The one helper behind everything the learner sees and earns (§8.2):
 * `computeOverall(levelCheck.subScoresByLevel[level])` — the client's own
 * overall formula, so there is no Python/JS rounding drift. Without a
 * `levelCheck` the Exam-standard `fb.scores.overall` is used and
 * `levelMarked` is false.
 */
export function resolveMarkedScore(
  fb: Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'>,
  level: MarkingLevel,
): MarkedScore {
  if (isUnscored(fb)) return { score: null, level, levelMarked: false, earnsBonus: false };
  const sub = fb.levelCheck?.subScoresByLevel[level];
  if (!sub) {
    return { score: fb.scores.overall, level: 'exam', levelMarked: false, earnsBonus: true };
  }
  const score = computeOverall({ communication: sub.comm, language: sub.know, accuracy: sub.acc, fluency: sub.fluency });
  return { score, level, levelMarked: true, earnsBonus: markingLevelEarnsBonus(level) };
}

/**
 * §8.3 — the Full report's sub-score grid on a ladder reply. The four values are
 * the ladders behind each sub-score (§6 step 3), so they are named after them:
 * comm = Answering (T/O/F), know = Range (R), acc = Accuracy (A), fluency =
 * Linking (L) — never "Fluency", which a transcript cannot show.
 */
export function ladderScoreGrid(sub: LadderSubScores): { label: string; val: number }[] {
  return [
    { label: 'Answering', val: sub.comm },
    { label: 'Range', val: sub.know },
    { label: 'Accuracy', val: sub.acc },
    { label: 'Linking', val: sub.fluency },
  ];
}

/** `resolveMarkedScore(fb, level).score`. */
export function markedScore(
  fb: Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'>,
  level: MarkingLevel,
): number | null {
  return resolveMarkedScore(fb, level).score;
}
