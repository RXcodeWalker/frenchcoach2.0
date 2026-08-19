// ── scoreCandidate — docs §8.2. Pure: every term isolated and independently testable. ─

import { PROVENANCE_TRUST, type ScoreCandidateArgs } from './types';

const W_BAND_FIT = 3.0;
const W_COACH_FOCUS = 2.0;
const W_DEMAND_COVERAGE_GAP = 1.5;
const W_EXPOSURE_FRESHNESS = 1.0;
const W_PROVENANCE_TRUST = 0.5;
const W_SESSION_REPETITION = 1.0;

/** docs §8.2. The `review` slot's band is null (ignored) — always fits (1.0). */
export function bandFit(demandScore: number, band: { lo: number; hi: number } | null): number {
  if (band === null) return 1;
  const { lo, hi } = band;
  if (demandScore >= lo && demandScore <= hi) return 1;
  if (demandScore < lo) return Math.max(0, 1 - (lo - demandScore) / 2.0);
  return Math.max(0, 1 - (demandScore - hi) / 2.0);
}

/** docs §8.2 — structures ∩ focusSkillIds, or cognitiveDemand matches the active demand problem. */
export function coachFocusMatch(args: ScoreCandidateArgs): number {
  const { candidate, focusSkillIds, activeDemandProblem } = args;
  const demands = candidate.question.demands;
  if (demands && focusSkillIds.some((id) => (demands.structures as string[]).includes(id))) return 1;
  if (demands && activeDemandProblem && demands.cognitiveDemand === activeDemandProblem) return 1;
  return 0;
}

/** docs §8.2 — 1 minus the confidence of the demand node for this question's own cognitiveDemand; absent -> 1.0 (max gap). */
export function demandCoverageGap(candidate: ScoreCandidateArgs['candidate']): number {
  if (candidate.demandNodeConfidence === null) return 1.0;
  return 1 - candidate.demandNodeConfidence;
}

/** docs §8.2 — binary on purpose (no per-item exposure timestamps exist to grade recency). */
export function exposureFreshness(candidate: ScoreCandidateArgs['candidate']): number {
  return candidate.seen ? 0.2 : 1.0;
}

export function provenanceTrust(candidate: ScoreCandidateArgs['candidate']): number {
  const demands = candidate.question.demands;
  if (!demands) return 0;
  return PROVENANCE_TRUST[demands.provenance];
}

export function sessionRepetition(candidate: ScoreCandidateArgs['candidate']): number {
  return candidate.cognitiveDemandUsedThisSession ? 1 : 0;
}

/**
 * docs §8.2. `demandScore` is the candidate's own `deriveDemandScore(demands)`
 * result, precomputed by the caller (selectQuestions) since it is invariant
 * per question across slots — kept as a parameter here so this function has
 * no dependency on the demand module beyond what's needed for bandFit.
 * Legacy questions without `demands` pass `demandScore: null`: rung 4 of the
 * docs §8.3 escalation ladder is the only path that reaches them, and it
 * "omits the bandFit term" — implemented here as dropping the term from the
 * sum entirely (not defaulting it to a fixed score) rather than ranking on
 * the remaining terms alone, matching escalation rung 2's own wording.
 */
export function scoreCandidate(args: ScoreCandidateArgs, demandScore: number | null): number {
  const bandFitTerm = demandScore === null ? 0 : W_BAND_FIT * bandFit(demandScore, args.slot.band);
  return (
    bandFitTerm +
    W_COACH_FOCUS * coachFocusMatch(args) +
    W_DEMAND_COVERAGE_GAP * demandCoverageGap(args.candidate) +
    W_EXPOSURE_FRESHNESS * exposureFreshness(args.candidate) +
    W_PROVENANCE_TRUST * provenanceTrust(args.candidate) -
    W_SESSION_REPETITION * sessionRepetition(args.candidate)
  );
}
