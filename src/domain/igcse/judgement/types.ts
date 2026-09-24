/**
 * S1 Layer-2 judgement types — Cambridge IGCSE French 0520 Paper 3 Speaking.
 * Input transcript shape, Judge port, and typed assessment output.
 */

import type { BandLabel } from '../rubric';
import type { TimeFrame } from '../evidence/types';

/**
 * Confidentiality gates redistribution, not scoring — 'confidential-internal'
 * covers teacher-conducted recordings against TN booklets (S3); assertRedistributable
 * (judgement/scoreSpeaking.ts) is the guard that blocks those from export/sync.
 */
export type ContentProvenance = 'original-practice' | 'confidential-internal';

/** Candidate-only transcript in Cambridge 0520 Paper 3 shape. */
export interface SpeakingTranscript {
  contentProvenance: ContentProvenance;
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
  /** S2 optional detector hint for two-part tasks. */
  partsExpected?: 1 | 2;
  /**
   * Second-part prompt of a two-part task (SessionQuestion.secondPartText),
   * so the judge can apply "partly communicated" against the whole task.
   * Absent for one-part tasks and hand-authored fixtures.
   */
  secondPartPrompt?: string;
  /**
   * How many times the examiner repeated this task, from the session's
   * examinerEvents. Absent when there is no session provenance.
   */
  repetitions?: number;
}

/**
 * What the examiner had to do to get this answer, projected from the
 * session's examinerEvents + examiner utterance text (toSpeakingTranscript).
 * The first bullet of every Communication band turns on exactly this
 * (repetition / alternative-question use), so the judge reads it from here
 * rather than guessing from the candidate's words.
 */
export interface ExaminerSupport {
  repetitions: number;
  /** Text of the alternative question actually asked, or null if the main question was used. */
  alternativeAsked: string | null;
  /** Text of the second part actually asked, or null if none was asked. */
  secondPartAsked: string | null;
  extensionPrompts: number;
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
  /** S2 optional detector hint if a question has known expected time frame. */
  expectedTimeFrame?: TimeFrame;
  /**
   * S4 optional candidate speaking time for this turn, in seconds, summed from
   * STT word timings (see toSpeakingTranscript). Absent for hand-authored
   * transcripts with no timing source (unit fixtures, manual entry).
   */
  candidateResponseDurationS?: number;
  /**
   * W1: which input channel produced this turn's candidate utterance(s) — see
   * stt/types.ts's CandidateInputMode. 'text' when every candidate utterance
   * behind this turn was typed; 'speech' when at least one was spoken; absent
   * when there is no live-session provenance (hand-authored fixtures,
   * ASR-annotated recordings). Read only by the insufficient-evidence-duration
   * guardrail, to avoid penalizing a typed turn's necessarily-zero speaking
   * duration — see guardrails/insufficientEvidence.ts.
   */
  inputMode?: 'speech' | 'text';
  /**
   * Examiner support recorded for this turn — see ExaminerSupport. Absent for
   * hand-authored transcripts and for further-question turns (turnId
   * 'further1' | 'further2'), which the examiner asks once with no support.
   */
  examinerSupport?: ExaminerSupport;
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
