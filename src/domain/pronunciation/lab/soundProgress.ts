/**
 * Pronunciation Lab — "Your French sounds" (pronunciation-lab plan §3.4). Pure.
 *
 * From the learner's Lab takes only: which two sound families are strongest and
 * which two are worth working on. A family needs the same evidence it needs for
 * the "Your sounds" grid (`familyStatuses`: enough observations over enough days)
 * before it is named at all, and the card never shows the accuracy behind it.
 */

import { SCORED_FAMILIES, familyStatuses, type DatedObservation, type FamilyStatus, type ScoredFamilyId } from './soundFamilies';
import { LAB_THRESHOLDS } from './thresholds';

export interface SoundProgress {
  statuses: Record<ScoredFamilyId, FamilyStatus>;
  /** Up to two families, best first; only ones that are Clear or Getting there. */
  strongest: ScoredFamilyId[];
  /** Up to two families, weakest first; only ones that are Needs work or Getting there, and never one already in `strongest`. */
  workOn: ScoredFamilyId[];
  /** How many families have enough data to be named. */
  measured: number;
}

/** The mean accuracy `familyStatuses` judges a family by (its most recent observations). */
function recentMean(observations: readonly DatedObservation[], family: ScoredFamilyId): number {
  const recent = observations.filter((o) => o.family === family).slice(-LAB_THRESHOLDS.family.recentObservations);
  return recent.length === 0 ? 0 : recent.reduce((sum, o) => sum + o.accuracy, 0) / recent.length;
}

/** `observations` oldest first. */
export function soundProgress(observations: readonly DatedObservation[]): SoundProgress {
  const statuses = familyStatuses(observations);
  const measuredFamilies = SCORED_FAMILIES.filter((f) => statuses[f] !== 'notEnoughData');
  const mean = new Map(measuredFamilies.map((f) => [f, recentMean(observations, f)]));
  const byMean = (a: ScoredFamilyId, b: ScoredFamilyId) => (mean.get(b) ?? 0) - (mean.get(a) ?? 0);

  const strongest = measuredFamilies
    .filter((f) => statuses[f] === 'clear' || statuses[f] === 'gettingThere')
    .sort(byMean)
    .slice(0, 2);
  const workOn = measuredFamilies
    .filter((f) => (statuses[f] === 'needsWork' || statuses[f] === 'gettingThere') && !strongest.includes(f))
    .sort((a, b) => -byMean(a, b))
    .slice(0, 2);
  return { statuses, strongest, workOn, measured: measuredFamilies.length };
}
