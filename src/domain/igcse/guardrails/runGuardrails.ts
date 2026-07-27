/**
 * S5 L3 composition entry point — pure, deterministic, no I/O. Composes all
 * guardrails and returns their combined triggers.
 *
 * Phase 5 (§10.6): also composes the evidence-ceiling hook, which is the only
 * path by which an L1 signal may cap an L2 mark. It is doubly gated (calibration
 * ledger + sourced ceiling registry, both empty today), so `adjustments` is
 * always `[]` and L3 remains advisory in practice: it does not clamp marks or
 * short-circuit to `unscored` until a validation phase promotes a detector.
 */

import { DEFAULT_DURATION_CONFIG } from './config';
import { applyEvidenceCeilings } from './evidenceCeilings';
import { checkInsufficientEvidence } from './insufficientEvidence';
import { verifyQuotes } from './quoteVerification';
import type { EvidenceProfile } from '../evidence/types';
import type { SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import type { GuardrailReport, InsufficientEvidenceDurationConfig } from './types';

export function runGuardrails(
  assessment: SpeakingAssessment,
  evidence: EvidenceProfile,
  transcript: SpeakingTranscript,
  durationConfig: InsufficientEvidenceDurationConfig = DEFAULT_DURATION_CONFIG,
): GuardrailReport {
  const ceilings = applyEvidenceCeilings(assessment, evidence);

  return {
    triggers: [
      ...verifyQuotes(assessment, transcript),
      ...checkInsufficientEvidence(evidence, durationConfig),
      ...ceilings.triggers,
    ],
    adjustments: ceilings.adjustments,
  };
}
