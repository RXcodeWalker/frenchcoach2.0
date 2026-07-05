/**
 * S1 Layer-2 judgement types — Cambridge IGCSE French 0520 Paper 3 Speaking.
 * Input transcript shape, Judge port, and typed assessment output.
 */

import type { BandLabel } from '../rubric';

/** Candidate-only transcript in Cambridge 0520 Paper 3 shape. */
export interface SpeakingTranscript {
  /** Literal; asserted before any judge call (UCLES copyright constraint). */
  contentProvenance: 'original-practice';
  /** Exactly ROLE_PLAY.tasks (5). */
  rolePlay: RolePlayTaskResponse[];
  topicConversations: [TopicConversation, TopicConversation];
}

export interface RolePlayTaskResponse {
  taskId: string;
  /** Original practice instruction (context for the judge). */
  taskPrompt: string;
  /** Candidate utterance only. */
  candidateResponse: string;
}

export interface TopicConversation {
  conversationId: 'topic1' | 'topic2';
  /** 0520 topic areas; metadata only in S1. */
  topicArea?: 'A' | 'B' | 'C' | 'D' | 'E';
  turns: ConversationTurn[];
}

export interface ConversationTurn {
  turnId: string;
  /** Original practice question (context for the judge). */
  questionPrompt: string;
  /** Candidate utterance only. */
  candidateResponse: string;
}

/** Injected LLM seam — no model/temperature/retry in S1. */
export interface JudgeRequest {
  prompt: string;
}

export interface JudgeResponse {
  /** Expected to be a JSON string matching JudgeOutputSchema. */
  raw: string;
}

export type Judge = (req: JudgeRequest) => Promise<JudgeResponse>;

// ── Assessment output types ───────────────────────────────────────────────────

export type EvidenceSource = 'rolePlay' | 'topic1' | 'topic2';

export interface EvidenceSpan {
  source: EvidenceSource;
  /** Must be a substring of the cited transcript text (after normalization). */
  quote: string;
}

/** Role play: 0/1/2 only — no best-fit placement field. */
export interface RolePlayTaskMark {
  taskId: string;
  mark: 0 | 1 | 2;
  /** Must match (normalized) a canonical RP descriptor bullet. */
  descriptorApplied: string;
  evidenceSpans: EvidenceSpan[];
}

export type BestFitPlacement = 'convincingly' | 'adequately' | 'just';

export interface BandAssessment {
  mark: number;
  band: { min: number; max: number; label: BandLabel | null };
  bestFitPlacement: BestFitPlacement;
  /** Verbatim canonical bullets of the chosen band (normalized match). */
  descriptorsApplied: string[];
  justification: string;
  evidenceSpans: EvidenceSpan[];
}

export interface SpeakingAssessment {
  rolePlay: { tasks: RolePlayTaskMark[]; total: number };
  communication: BandAssessment;
  qualityOfLanguage: BandAssessment;
  total: number;
}
