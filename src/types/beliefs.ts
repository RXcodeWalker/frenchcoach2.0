// ── Coach MVP: Belief contracts ────────────────────────────────────────────────
// A CoachBeliefSnapshot is a projection over the existing diagnostic engine. The
// diagnostic engine (frenchCoach_sde) remains the source of truth for mastery;
// this snapshot is a coach-friendly, denormalised read model that the
// recommendation engine and UI can consume without recomputing.

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
