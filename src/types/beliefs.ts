// ── Coach MVP: Belief contracts ────────────────────────────────────────────────
// A CoachBeliefSnapshot is a projection over the existing diagnostic engine. The
// diagnostic engine (frenchCoach_sde) remains the source of truth for mastery;
// this snapshot is a coach-friendly, denormalised read model that the
// recommendation engine and UI can consume without recomputing.
//
// Phase 2 additions (evidence-driven beliefs) live below the existing types.
// They are purely additive — nothing in the current recommendation or UI path
// reads from them yet.

export type BeliefTrend =
  | 'unknown'
  | 'improving'
  | 'stable'
  | 'declining'
  | 'volatile';

export interface SkillBelief {
  nodeId: string;
  label: string;
  category: string;
  /** 0–1 mastery, mirrors SkillEntry.score from the diagnostic engine. */
  mastery: number;
  /** 0–1 confidence derived from observation count. */
  confidence: number;
  trend: BeliefTrend;
  /** 0–1 — how often the learner avoids this structure when invited. */
  avoidanceScore: number;
  evidenceCount: number;
  lastObservedAt: string | null;
  recurringIssueIds: string[];
}

export interface TopicBelief {
  topicKey: string;
  sessionsCompleted: number;
  averageScore: number;
  uniqueQuestionsAnswered: number;
  mastered: boolean;
  lastSessionAt: string | null;
}

export interface CoachBeliefSnapshot {
  learnerId: string;
  generatedAt: string;
  projectionVersion: string;
  skills: Record<string, SkillBelief>;
  topics: Record<string, TopicBelief>;
  weakestSkillIds: string[];
  strongestSkillIds: string[];
}

// ── Phase 2: Evidence-driven belief types ─────────────────────────────────────
// These types support the evidence-derived belief model introduced in Phase 2.
// They live alongside the existing types so the migration can be incremental.

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
 * Snapshot produced by the evidence-driven belief reducer.
 * Parallel to CoachBeliefSnapshot but does not include topics (out of scope
 * for Phase 2 — topics remain sourced from analytics).
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
