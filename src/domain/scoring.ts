import type { ExaminerVerdict, FeedbackV2 } from '../types';

/**
 * The single scalar threshold above which a score counts as a "success" for
 * coaching purposes. Survives only where a scalar score genuinely exists
 * (LLM overall, XP award) — replaces 4 previously-drifting `>= 7` literals
 * (i-am-building-an-cosmic-cascade.md, Resolved Decisions §3).
 */
export const LANGUAGE_SUCCESS_SCORE = 7;

/** E2: a response with no real score anywhere is invalid input, not a "5" — callers must treat this as a failure and let the fallback chain run. */
export class NoScoreInFeedbackError extends Error {
  constructor() {
    super('Backend feedback contained no usable score');
    this.name = 'NoScoreInFeedbackError';
  }
}

/**
 * The coach "overall": equal-weight mean of whichever coach sub-scores are
 * present, rounded to 1 decimal. Throws NoScoreInFeedbackError when none are —
 * never a fabricated number. Used only when the backend sent no `scores.overall`.
 */
export function computeOverall(parts: {
  communication?: number;
  language?: number;
  accuracy?: number;
  fluency?: number;
}): number {
  const present = [parts.communication, parts.language, parts.accuracy, parts.fluency]
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (present.length === 0) throw new NoScoreInFeedbackError();
  const mean = present.reduce((a, b) => a + b, 0) / present.length;
  return Math.round(mean * 10) / 10;
}

/**
 * The labelled sub-score grid shown under the Overall headline. Labels match
 * the fields they read; Accuracy is omitted for sessions stored before
 * `scores.accuracy` existed rather than shown as a made-up number.
 */
export function coachScoreGrid(scores: FeedbackV2['scores']): { label: string; val: number }[] {
  return [
    { label: 'Comm', val: scores.communication },
    { label: 'Lang', val: scores.language },
    ...(typeof scores.accuracy === 'number' ? [{ label: 'Accuracy', val: scores.accuracy }] : []),
    { label: 'Fluency', val: scores.fluency },
  ];
}

export const scoreColor = (val: number): string =>
  val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444';

/**
 * Same 8 / 6 thresholds as `scoreColor`, but resolved through the theme-aware
 * role tokens (progress / reward / correction `-text`), so a score reads at AA
 * contrast in light and dark. Learn + feedback surfaces use this; `scoreColor`
 * stays for SVG strokes that need a literal colour (PronunciationCard).
 */
export const scoreTone = (val: number): string =>
  val >= 8 ? 'var(--progress-text)' : val >= 6 ? 'var(--reward-text)' : 'var(--correction-text)';

/**
 * The single discriminant for "was this attempt actually graded": any
 * ungraded result carries a reason under `unscored` alongside placeholder
 * zero scores (Phase 4a, widened A4). Never infer "unscored" from
 * `scores.overall === 0` — a real bad answer legitimately scores 0 too, and
 * conflating the two would hide genuine low scores as "not graded" or vice
 * versa.
 */
export const isUnscored = (feedback: Pick<FeedbackV2, 'unscored'>): boolean =>
  feedback.unscored !== undefined;

/**
 * Every UI render of an overall score must go through this — returns `null`
 * when the attempt was never graded (offline fallback), so callers render an
 * explicit "not graded" state instead of a fabricated "0.0".
 */
export const displayScore = (feedback: Pick<FeedbackV2, 'unscored' | 'scores'>): string | null =>
  isUnscored(feedback) ? null : feedback.scores.overall.toFixed(1);

/**
 * Mean of only the real (non-null) scores in a list — the one place this
 * "average, skipping unscored entries" pattern is implemented, so per-session
 * averages (SessionSummary, SessionProgressBar, topic mastery) can't
 * independently drift on whether an unscored 0 should count. Returns `null`
 * when there are no real scores to average, never a fabricated 0.
 */
export function averageRealScores(scores: (number | null)[]): number | null {
  const real = scores.filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

export function scoreToBand(score: number): ExaminerVerdict['predictedBand'] {
  if (score >= 8.5) return 'Extended-High';
  if (score >= 7)   return 'Extended-Mid';
  if (score >= 5.5) return 'Core-Secure';
  if (score >= 4)   return 'Core-Developing';
  if (score >= 2.5) return 'Foundation-Secure';
  return 'Foundation-Developing';
}

export function bandToAdvice(band: ExaminerVerdict['predictedBand']): string {
  switch (band) {
    case 'Foundation-Developing': return "Focus on sentence length and basic accuracy — aim for 30+ words.";
    case 'Foundation-Secure':     return "Add one tense beyond present (past or future) to reach Core bands.";
    case 'Core-Developing':       return "Eliminate elision/auxiliary errors and add an opinion phrase.";
    case 'Core-Secure':           return "One correct conditional or subjunctive sentence moves you to Extended.";
    case 'Extended-Mid':          return "Aim for zero major errors; add a sophisticated connector (cependant, néanmoins).";
    case 'Extended-High':         return "Refine register — eliminate all minor slips and vary sentence openings.";
  }
}
