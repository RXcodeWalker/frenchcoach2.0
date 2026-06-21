// ── Coach: Belief contracts ────────────────────────────────────────────────────
// The diagnostic engine (frenchCoach_sde) remains live for legacy UI, but the
// coach's read model is the evidence-driven EvidenceBeliefSnapshot produced by
// beliefReducer. The earlier diagnostic-projection types (CoachBeliefSnapshot /
// SkillBelief / TopicBelief) have been removed now that every coach consumer
// reads the evidence snapshot.

export type BeliefTrend =
  | 'unknown'
  | 'improving'
  | 'stable'
  | 'declining'
  | 'volatile';

// ── Evidence-driven belief types ───────────────────────────────────────────────
// These types support the evidence-derived belief model that drives all coach
// decisions (recommendations, daily plan, interventions).

/**
 * One weighted observation stored inside SkillBeliefState. Keeps the last
 * N observations per skill for trend analysis without storing full events.
 */
export interface BeliefObservation {
  occurredAt: string;
  sourceEventId: string;
  mode: string;
  score?: number;
  /** True when the evaluator judged this as a success. */
  success: boolean;
  /** Composite weight that was applied to this observation. */
  weight: number;
  /** Raw reliability score (assessmentConfidence × taskValidity × signalQuality). */
  reliability: number;
}

/**
 * Accumulated belief state for a single skill node. Persisted as the
 * incrementally-updated intermediate state so we never need to replay all
 * events from scratch.
 *
 * Uses a Beta-distribution model: `mastery = alpha / (alpha + beta)`.
 * Both alpha and beta start at 1.0 (Laplace / uniform prior) to prevent
 * cold-start extremes on the first observation.
 */
export interface SkillBeliefState {
  nodeId: string;
  /** Beta distribution: grows with each weighted success. Starts at 1.0 (prior). */
  alpha: number;
  /** Beta distribution: grows with each weighted failure. Starts at 1.0 (prior). */
  beta: number;
  /** Raw sum of evidence weights for successes. */
  weightedSuccess: number;
  /** Raw sum of evidence weights for failures. */
  weightedFailure: number;
  /** Total sum of all evidence weights (success + failure). */
  weightedEvidence: number;
  /** Count of individual evidence events that passed the noise filter. */
  rawEvidenceCount: number;
  avoidance: {
    /** Total weight of behavior events where the skill was avoided. */
    weightedAvoided: number;
    /** Total weight of behavior events where the skill was invited (same events). */
    weightedInvited: number;
  };
  /**
   * Last RECENT_OBS_WINDOW observations, oldest-first. Used for trend analysis
   * and reliability tracking without storing complete EvidenceEvents.
   */
  recentObservations: BeliefObservation[];
  /** Total weight contributed by each mode ('practice' | 'exam' | 'story'). */
  sourceBreakdown: Record<string, number>;
  /** Issue categories that appeared repeatedly across evidence events. */
  recurringIssueIds: string[];
  lastObservedAt: string | null;
}

/**
 * A single skill belief derived entirely from EvidenceEvents rather than
 * from the diagnostic engine's mastery model.
 *
 * When evidence is too sparse for a skill, `fallbackUsed` is set and the
 * mastery/confidence values come from diagnosticEngine instead so the
 * recommendation engine still has data for all skills.
 */
export interface EvidenceDerivedSkillBelief {
  nodeId: string;
  label: string;
  category: string;
  /** 0–1: Beta mean = alpha / (alpha + beta). */
  mastery: number;
  /** 0–1: grows with weighted evidence volume. */
  confidence: number;
  /** 0–1: high when evidence is sparse or the signal is contradictory. */
  uncertainty: number;
  trend: BeliefTrend;
  /** 0–1: ratio of avoided invitations recorded in behavior evidence. */
  avoidanceScore: number;
  evidenceCount: number;
  weightedEvidence: number;
  /** Mean reliability score across recent observations. */
  reliabilityMean: number;
  lastObservedAt: string | null;
  recurringIssueIds: string[];
  /** Total weight contributed by each mode. */
  sourceBreakdown: Record<string, number>;
  /** Present when mastery was sourced from diagnosticEngine due to sparse evidence. */
  fallbackUsed?: 'diagnosticEngine';
}

/**
 * Snapshot produced by the evidence-driven belief reducer. This is the sole
 * coach read model. Topics are out of scope here — they remain sourced from
 * analytics (getTopicMasteryAll) where needed.
 */
export interface EvidenceBeliefSnapshot {
  learnerId: string;
  generatedAt: string;
  /** Bump this when the reducer algorithm changes to flag stale cached state. */
  reducerVersion: string;
  skills: Record<string, EvidenceDerivedSkillBelief>;
  /** Skill IDs with low mastery and sufficient confidence (evidence-derived only). */
  weakestSkillIds: string[];
  /** Skill IDs with high mastery and sufficient confidence (evidence-derived only). */
  strongestSkillIds: string[];
  /** Total raw evidence events that contributed to this snapshot. */
  totalEvidenceProcessed: number;
}
