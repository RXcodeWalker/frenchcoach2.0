// ── Coach: Goal, Recommendation, Orchestrator & Profile contracts ──────────────

import type { Session, Question, FeedbackV2, AvoidanceSignal } from './index';
import type { EvidenceEvent } from './evidence';
import type { EvidenceBeliefSnapshot } from './beliefs';
import type { LearningProblem } from './intervention';

// ── Goal types ────────────────────────────────────────────────────────────────

export type CoachGoalType =
  | 'general_speaking'
  | 'igcse'
  | 'gcse'
  | 'delf'
  | 'travel'
  | 'business'
  | 'conversation_fluency';

export interface CoachGoal {
  id: string;
  type: CoachGoalType;
  label: string;
  /** ISO date string, e.g. exam date or "no deadline". */
  targetDate?: string;
  /** Weekly practice commitment in minutes. */
  weeklyMinutes?: number;
  createdAt: string;
  active: boolean;
}

// ── CoachProfile — unified learner model ─────────────────────────────────────

export type AgeBand = 'child' | 'teen' | 'adult' | 'senior';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface CoachProfile {
  learnerId: string;
  createdAt: string;
  updatedAt: string;

  /** Basic demographic info, optional. */
  demographics: {
    ageBand: AgeBand;
    preferredLanguage: string;
  };

  goals: CoachGoal[];
  activeGoalId: string | null;

  /** CEFR level estimate derived from session performance. */
  cefr: {
    estimate: CEFRLevel;
    confidence: number;          // 0–1
    updatedAt: string;
  };

  /** Affect / confidence signals. */
  affect: {
    confidenceScore: number;     // 0–1, rolling
    anxietyRisk: number;         // 0–1
    correctionTolerance: number; // 0–1 (low = needs gentle feedback)
    motivationPattern: 'consistent' | 'bursty' | 'declining' | 'new';
  };

  /** Session habit summary. */
  habits: {
    streakDays: number;
    averageSessionMinutes: number;
    consistencyScore: number;    // 0–1
    lastActiveAt: string | null;
  };

  /** Onboarding completion flag. */
  onboardingComplete: boolean;

  /**
   * Optional exam date string (ISO). When set the decision engine
   * applies urgency scoring that biases toward timed exam practice.
   */
  examDate?: string;
}

// ── Decision engine types ─────────────────────────────────────────────────────

export type UrgencyType =
  | 'exam_soon'          // exam < 14 days away
  | 'overdue_review'     // skills not seen > 10 days
  | 'confidence_drop'    // recent score trend declining
  | 'streak_at_risk'     // no session today and streak > 0
  | 'none';

export type CandidateActionType =
  | 'review_weak_skill'
  | 'practice_topic'
  | 'stretch_skill'
  | 'exam_mock'
  | 'roleplay'
  | 'confidence_session'
  | 'general_practice';

export interface CandidateAction {
  type: CandidateActionType;
  score: number;            // composite score 0–100
  targetSkillIds: string[];
  targetTopicKey?: string;
  rationale: string;
  suggestedMode: 'quick' | 'standard' | 'deep_dive';
}

export interface DailyPlan {
  generatedAt: string;
  urgency: UrgencyType;
  urgencyMessage?: string;
  topAction: CandidateAction;
  allCandidates: CandidateAction[];
  sessionBlend: SessionBlend;
  explanation: string;       // tutor-style "today we are practicing X because Y"
}

export interface SessionBlend {
  warmupPct: number;         // ~20
  reviewPct: number;         // ~30
  targetSkillPct: number;    // ~30
  stretchPct: number;        // ~10
  choicePct: number;         // ~10
  focusSkillIds: string[];
  focusTopicKey?: string;
}

// ── Recommendation types ──────────────────────────────────────────────────────

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
  /** Prerequisite-readiness notes, e.g. "Past tense needs work before hypotheticals." */
  readinessReasons?: string[];
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
  mode: 'practice' | 'exam' | 'story' | 'daily-news' | 'scenario-architect';
  topicsUsed?: string[];
  /**
   * Pre-computed final score (e.g. after a shield boost in Learn). Ignored for
   * XP/Session.score/achievements when `feedback.unscored === 'no_llm_offline'`
   * — the orchestrator branches on that flag, not on this value, so a real
   * graded 0 is never conflated with "not graded."
   */
  finalScore: number;
  streakDays: number;
  totalSessionsBefore: number;
}

export interface OrchestratorResult {
  evidenceEvents: EvidenceEvent[];
  beliefSnapshot: EvidenceBeliefSnapshot;
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
  /** Grammar skill to offer MicroDrill for, when recurring failures detected. */
  drillSkillId: string | null;
  /** The tracked recurring-grammar problem to remediate, if one is active. */
  activeProblem: LearningProblem | null;
}

// ── Weekly review types ───────────────────────────────────────────────────────

export interface SkillMovement {
  skillId: string;
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface WeeklyReview {
  generatedAt: string;
  periodStart: string;   // ISO date
  periodEnd: string;
  sessionsCompleted: number;
  totalMinutes: number;
  improved: SkillMovement[];
  slipping: SkillMovement[];
  newlyVisible: string[];       // skill IDs surfaced for first time
  topMistakeIds: string[];
  avoidancePatterns: string[];  // skill IDs being avoided
  confidenceTrend: 'rising' | 'stable' | 'falling' | 'unknown';
  examReadiness?: ExamReadiness;
  weekFocusPriorities: string[]; // 2–3 plain-language bullet points
  tutorSummary: string;           // 1–2 sentence narrative
}

export interface ExamReadiness {
  predictedScore: number;        // 0–100
  confidenceInterval: [number, number];
  topRisks: string[];
  daysUntilExam: number | null;
  readinessLevel: 'on_track' | 'at_risk' | 'critical' | 'no_exam';
}
