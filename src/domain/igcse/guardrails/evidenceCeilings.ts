/**
 * Phase 5 (§10.6) — the L3 promotion hook.
 *
 * This is where the architectural law "L1 observes, L3 decides mark-influence"
 * is finally mechanised. A Phase-3 detector emits observations from the moment
 * it ships; whether any of those observations may CAP a mark is decided here,
 * and only for detectors the calibration ledger has promoted to `eligible`.
 *
 * Two independent gates must both open for a mark to move:
 *   1. `resolveMarkInfluence(detector) === 'eligible'` — a calibration
 *      reference recorded at this exact detector version (markInfluence.ts).
 *   2. A matching entry in `EVIDENCE_CEILINGS` carrying a sourced threshold
 *      (config.ts).
 *
 * Both are empty/closed today, so this module is a no-op that returns the
 * unmodified marks. That is the point: the hook exists and is tested, so
 * turning a validated signal on is a config edit rather than new code.
 */

import { EVIDENCE_CEILINGS } from './config';
import type {
  CeilingCriterion,
  CriterionAdjustment,
  EvidenceCeiling,
  GuardrailTrigger,
} from './types';
import { registeredDetectors } from '../evidence/buildEvidence';
import { resolveMarkInfluence } from '../evidence/framework/markInfluence';
import type { EvidenceProfile } from '../evidence/types';
import type { SpeakingAssessment } from '../judgement/types';

/**
 * Ceilings whose detector currently resolves to `eligible`. A ceiling naming an
 * unpromoted (or version-drifted) detector is inert — it is NOT an error at
 * scoring time, because a detector version bump legitimately invalidates its
 * reference and must degrade safely to "no clamp" rather than throw mid-attempt.
 * CI (`no-uncalibrated-influence.test.ts`) is what makes the mismatch loud.
 */
function activeCeilings(): EvidenceCeiling[] {
  const influenceById = new Map(
    registeredDetectors().map((detector) => [detector.id, resolveMarkInfluence(detector)]),
  );

  return EVIDENCE_CEILINGS.filter(
    (ceiling) => influenceById.get(ceiling.detectorId)?.effective === 'eligible',
  );
}

function criterionMark(assessment: SpeakingAssessment, criterion: CeilingCriterion): number {
  return criterion === 'communication'
    ? assessment.communication.mark
    : assessment.qualityOfLanguage.mark;
}

export interface CeilingResult {
  triggers: GuardrailTrigger[];
  adjustments: CriterionAdjustment[];
}

/**
 * Apply every active evidence ceiling to the L2 assessment.
 *
 * Pure and deterministic: given the same assessment, evidence, ledger and
 * config, it returns the same clamps. Marks only ever move DOWN — a ceiling
 * caps, it never raises (§3.5: L3 produces a ceiling and a confidence, not a
 * replacement judgement), which also keeps "mark positively / reward
 * achievement" intact.
 */
export function applyEvidenceCeilings(
  assessment: SpeakingAssessment,
  evidence: EvidenceProfile,
): CeilingResult {
  const ceilings = activeCeilings();
  if (ceilings.length === 0) {
    return { triggers: [], adjustments: [] };
  }

  const triggers: GuardrailTrigger[] = [];
  // Lowest cap wins per criterion, so multiple ceilings compose deterministically.
  const capsByCriterion = new Map<CeilingCriterion, number>();

  for (const ceiling of ceilings) {
    const supporting = evidence.observations.filter(
      (observation) =>
        observation.detectorId === ceiling.detectorId &&
        observation.type === ceiling.observationType &&
        observation.confidence >= ceiling.minConfidence,
    );
    if (supporting.length === 0) {
      continue;
    }

    const proposed = criterionMark(assessment, ceiling.criterion);
    if (proposed <= ceiling.maxMark) {
      continue;
    }

    const existing = capsByCriterion.get(ceiling.criterion);
    capsByCriterion.set(
      ceiling.criterion,
      existing === undefined ? ceiling.maxMark : Math.min(existing, ceiling.maxMark),
    );

    triggers.push({
      id: 'evidence_ceiling_applied',
      message:
        `${ceiling.criterion}: mark ${proposed} exceeds evidence ceiling ${ceiling.maxMark} ` +
        `(${ceiling.detectorId}/${ceiling.observationType}, ${supporting.length} observation(s))`,
      criterion: ceiling.criterion,
      detectorId: ceiling.detectorId,
      observationType: ceiling.observationType,
      proposedMark: proposed,
      maxMark: ceiling.maxMark,
      observationCount: supporting.length,
      thresholdSource: ceiling.thresholdSource,
    });
  }

  const adjustments: CriterionAdjustment[] = [...capsByCriterion.entries()]
    .map(([criterion, cap]) => ({
      criterion,
      proposedMark: criterionMark(assessment, criterion),
      finalMark: cap,
    }))
    // Stable order regardless of Map insertion order.
    .sort((a, b) => a.criterion.localeCompare(b.criterion));

  return { triggers, adjustments };
}
