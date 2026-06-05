// ── Coach MVP: Evidence contracts ──────────────────────────────────────────────
// An EvidenceEvent is a single, reliability-tagged observation produced when a
// learner completes an activity. It is the raw signal that the belief projection
// and recommendation engine consume. Kept deliberately small and event-like so it
// can migrate to a backend event log later without reshaping call sites.

export type EvidenceType =
  | 'language'
  | 'speech'
  | 'behavior'
  | 'confidence'
  | 'review'
  | 'transfer'
  | 'goal';

export type EvidenceEvaluator =
  | 'offline'
  | 'llm'
  | 'heuristic'
  | 'speech_model'
  | 'human';

export interface EvidenceReliability {
  /** How confident the evaluator is in its assessment (0–1). */
  assessmentConfidence: number;
  /** How valid the task was as a measurement (e.g. very short answers are weak). 0–1. */
  taskValidity: number;
  /** Quality of the underlying signal (transcript/audio clarity). 0–1. */
  signalQuality: number;
  evaluator: EvidenceEvaluator;
  rubricVersion: string;
}

export interface EvidenceContext {
  mode: string;
  topicKey?: string;
  questionId?: string;
  questionText?: string;
  targetDifficulty?: string;
  timed: boolean;
  engine?: string;
}

export interface EvidenceResult {
  score?: number;
  success?: boolean;
  wordCount?: number;
  avoided?: boolean;
  issueCount?: number;
  criticalIssueCount?: number;
}

export interface EvidenceObservation {
  transcript?: string;
  issueIds?: string[];
  issueCategories?: string[];
  avoidanceSkillIds?: string[];
  feedbackSummary?: string;
}

export interface EvidenceEvent {
  id: string;
  learnerId: string;
  occurredAt: string;
  sourceSessionId: string;
  sourceAttemptId?: string;
  evidenceType: EvidenceType;
  targetNodeIds: string[];
  observation: EvidenceObservation;
  result: EvidenceResult;
  reliability: EvidenceReliability;
  context: EvidenceContext;
}
