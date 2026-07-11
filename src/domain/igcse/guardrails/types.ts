/**
 * S5 Layer-3 guardrail types — deterministic, advisory triggers only (see
 * 02-scoring-pipeline-architecture.md §3.5). No mark-clamping / `unscored`
 * short-circuit in v1; that is Phase-A-gated (S6/S7).
 */

export type GuardrailId = 'quote_verification_failed' | 'insufficient_evidence_duration';

/** `id` is the stable string that lands in ScoringEnvelope.guardrailTriggers. */
export interface GuardrailTrigger {
  id: GuardrailId;
  message: string;
  [key: string]: unknown;
}

export interface GuardrailReport {
  triggers: GuardrailTrigger[];
}

export interface InsufficientEvidenceDurationConfig {
  /** UNVALIDATED — starting value, tuned in Phase A (roadmap S6). */
  minCombinedDurationS: number;
  /** UNVALIDATED — starting value, tuned in Phase A (roadmap S6). */
  minCombinedWordCount: number;
}
