// ── Coach MVP: Goal, Recommendation & Orchestrator contracts ───────────────────

import type { Session, Question, FeedbackV2, AvoidanceSignal } from './index';
import type { EvidenceEvent } from './evidence';
import type { CoachBeliefSnapshot } from './beliefs';

export type CoachGoalType = 'general_speaking' | 'igcse';

export interface CoachGoal {
  id: string;
  type: CoachGoalType;
  label: string;
  createdAt: string;
  active: boolean;
}

export type RecommendationType =
  | 'review_weak_skill'
  | 'continue_topic'
  | 'stretch_skill'
  | 'exam_practice'
  | 'confidence_repair';

export interface RecommendationRationale {
  primaryReason: string;
  evidenceSummary: string;
  goalLinks: string[];
  targetWeaknesses: string[];
  successCriteria: string[];
  alternativesConsidered: { title: string; whyNot: string }[];
  confidence: number;
}

export interface CoachRecommendation {
  id: string;
  learnerId: string;
  generatedAt: string;
  policyVersion: string;
  type: RecommendationType;
  title: string;
  description: string;
  targetSkillIds: string[];
  targetTopicKey?: string;
  suggestedMode: 'quick' | 'standard' | 'deep_dive';
  rationale: RecommendationRationale;
  status: 'active' | 'accepted' | 'dismissed' | 'completed';
}

/** Everything the orchestrator needs to process a completed answer. */
export interface OrchestratorInput {
  session: Session;
  question: Question | null;
  feedback: FeedbackV2;
  avoidanceSignals: AvoidanceSignal[];
  transcript: string;
  durationSec: number;
  mode: 'practice' | 'exam' | 'story';
  topicsUsed?: string[];
  /** Pre-computed final score (e.g. after a shield boost in Learn). */
  finalScore: number;
  streakDays: number;
  totalSessionsBefore: number;
}

export interface OrchestratorResult {
  evidenceEvents: EvidenceEvent[];
  beliefSnapshot: CoachBeliefSnapshot;
  recommendation: CoachRecommendation;
  xpResult: {
    gain: number;
    totalXP: number;
    gemsGain: number;
    totalGems: number;
    activeBoosters: { id: string; expiresAt: string; multiplier: number }[];
  };
  newUnlockedAchievementIds: string[];
  newLevelName: string;
}
