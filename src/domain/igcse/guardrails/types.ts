/**
 * S5 Layer-3 guardrail types — deterministic, advisory triggers only (see
 * 02-scoring-pipeline-architecture.md §3.5). No mark-clamping / `unscored`
 * short-circuit in v1; that is Phase-A-gated (S6/S7).
 */

export type GuardrailId =
  | 'quote_verification_failed'
  | 'insufficient_evidence_duration'
  /** Phase 5 (§10.6) — an `eligible` detector's evidence capped a criterion mark. */
  | 'evidence_ceiling_applied';

/** The two 0–15 band criteria a ceiling may cap. Role play (0/1/2 per task) is out of scope. */
export type CeilingCriterion = 'communication' | 'qualityOfLanguage';

/** `id` is the stable string that lands in ScoringEnvelope.guardrailTriggers. */
export interface GuardrailTrigger {
  id: GuardrailId;
  message: string;
  [key: string]: unknown;
}

/**
 * Phase 5 (§10.6) — a declarative "this evidence makes this mark impossible"
 * rule. Data, not code: the promotion procedure adds an entry to
 * config.ts::EVIDENCE_CEILINGS rather than editing guardrail logic.
 */
export interface EvidenceCeiling {
  /** Detector whose observations authorise this cap. Must resolve to `eligible`. */
  detectorId: string;
  /** Observation type within that detector's `produces` set. */
  observationType: string;
  /** Which criterion is capped. */
  criterion: CeilingCriterion;
  /**
   * Highest mark awardable when this evidence is present, 0–15.
   *
   * MUST be Cambridge-sourced or Phase-C-signed-off (§10.6 step 4) — recorded
   * in `thresholdSource`. There is no UNVALIDATED escape hatch for a value that
   * clamps a real mark.
   */
  maxMark: number;
  /** Minimum observation confidence before the cap applies. */
  minConfidence: number;
  /** The source backing `maxMark`. Non-empty, enforced by CI. */
  thresholdSource: string;
}

/**
 * Phase 5: the clamp L3 applied, if any. `appliedCeilings` is empty whenever no
 * eligible detector fired — which is always, pre-calibration.
 */
export interface CriterionAdjustment {
  criterion: CeilingCriterion;
  proposedMark: number;
  finalMark: number;
}

export interface GuardrailReport {
  triggers: GuardrailTrigger[];
  /**
   * Phase 5: mark adjustments from applied evidence ceilings. Always `[]` while
   * EVIDENCE_CEILINGS is empty, so L3 stays advisory-only until calibration.
   */
  adjustments: CriterionAdjustment[];
}

export interface InsufficientEvidenceDurationConfig {
  /** UNVALIDATED — starting value, tuned in Phase A (roadmap S6). */
  minCombinedDurationS: number;
  /** UNVALIDATED — starting value, tuned in Phase A (roadmap S6). */
  minCombinedWordCount: number;
}
