import type { ExaminerVerdict, FeedbackV2 } from '../types';

/**
 * The single scalar threshold above which a score counts as a "success" for
 * coaching purposes. Survives only where a scalar score genuinely exists
 * (LLM overall, XP award) — replaces 4 previously-drifting `>= 7` literals
 * (i-am-building-an-cosmic-cascade.md, Resolved Decisions §3).
 */
export const LANGUAGE_SUCCESS_SCORE = 7;

export const scoreColor = (val: number): string =>
  val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444';

/**
 * The single discriminant for "was this attempt actually graded": every offline
 * (no-LLM) result carries `unscored: 'no_llm_offline'` alongside placeholder
 * zero scores (Phase 4a). Never infer "unscored" from `scores.overall === 0` —
 * a real bad answer legitimately scores 0 too, and conflating the two would
 * hide genuine low scores as "not graded" or vice versa.
 */
export const isUnscored = (feedback: Pick<FeedbackV2, 'unscored'>): boolean =>
  feedback.unscored === 'no_llm_offline';

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
