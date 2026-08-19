/**
 * Constants for deriveAbility (docs §6.2-6.5). UNVALIDATED per CLAUDE.md
 * constraint #2 — no calibration data exists yet; placeholders in the same
 * spirit as domain/pronunciation/practiceThresholds.ts.
 */
import type { CognitiveDemand, DemandLevel } from '../demand/types';
import type { DifficultyTier } from '../../../types';

/** docs §6.1 — the demandScore a learner who has mastered a demand can handle. */
export const DEMAND_ANCHORS: Record<CognitiveDemand, number> = {
  describe: 2.0,
  explain: 4.0,
  justify: 6.0,
  compare: 6.5,
  hypothesize: 8.0,
};

/** UNVALIDATED — docs §6.2 step 1: below this, a demand node contributes nothing. */
export const MIN_DEMAND_CONFIDENCE = 0.20;
/** UNVALIDATED — docs §6.2 steps 3-4: below this, a node cannot cap or floor. */
export const RELIABLE_CONFIDENCE = 0.50;
/** UNVALIDATED — docs §6.2 step 3: mastery below this on a reliable node caps ability. */
export const MASTERY_WEAK = 0.40;
/** UNVALIDATED — docs §6.2 step 4: mastery at/above this on a reliable node floors ability. */
export const MASTERY_STRONG = 0.75;
/** UNVALIDATED — docs §6.2 step 1: evidence_d = anchor(d) - (1 - mastery) x SPREAD. */
export const SPREAD = 3.0;

/** docs §6.3 — demandScore -> displayed DemandLevel band. */
export function demandScoreToAbilityLevel(demandScore: number): DemandLevel {
  if (demandScore < 3.0) return 'A1';
  if (demandScore < 5.0) return 'A2';
  if (demandScore < 7.5) return 'B1';
  return 'B2';
}

/** UNVALIDATED — docs §6.3: confidence gate for showing a band in the UI at all. */
export const CONFIDENCE_BAND_HIDDEN_BELOW = 0.25;
/** UNVALIDATED — docs §6.3: below this and at/above CONFIDENCE_BAND_HIDDEN_BELOW, show "Around X" with a low-confidence indicator. */
export const CONFIDENCE_BAND_APPROXIMATE_BELOW = 0.50;

/** docs §6.4 — migrated DifficultyTier -> coldStart seed abilityScore. Absent -> 4.5 (today's default). */
export const COLD_START_SEED: Record<DifficultyTier, number> = {
  beginner: 2.5,
  intermediate: 4.5,
  advanced: 6.5,
  expert: 8.0,
};
export const COLD_START_DEFAULT_SEED = 4.5;

/** docs §6.5 — ability movement guards. UNVALIDATED. */
export const ABILITY_RISE_MIN_CONFIDENCE = 0.5;
export const ABILITY_RISE_MIN_DISTINCT_QUESTIONS = 3;
export const ABILITY_RISE_MIN_DISTINCT_SESSIONS = 2;
export const ABILITY_RISE_MAX_SUBBANDS_PER_SESSIONS = { subBands: 1, sessions: 3 };
/** docs §6.5 — falls are ungated but bounded by the reducer's own MAX_EVENT_WEIGHT + prior. */
export const MAX_EVENT_WEIGHT = 0.80;
