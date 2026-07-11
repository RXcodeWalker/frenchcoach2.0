/**
 * S5 L3 composition entry point — pure, deterministic, no I/O. Composes all
 * guardrails and returns their combined triggers. Advisory only in v1: does
 * not clamp marks or short-circuit to `unscored` (Phase-A-gated, S6/S7).
 */

import { DEFAULT_DURATION_CONFIG } from './config';
import { checkInsufficientEvidence } from './insufficientEvidence';
import { verifyQuotes } from './quoteVerification';
import type { EvidenceProfileSubset } from '../evidence/types';
import type { SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import type { GuardrailReport, InsufficientEvidenceDurationConfig } from './types';

export function runGuardrails(
  assessment: SpeakingAssessment,
  evidence: EvidenceProfileSubset,
  transcript: SpeakingTranscript,
  durationConfig: InsufficientEvidenceDurationConfig = DEFAULT_DURATION_CONFIG,
): GuardrailReport {
  return {
    triggers: [
      ...verifyQuotes(assessment, transcript),
      ...checkInsufficientEvidence(evidence, durationConfig),
    ],
  };
}
