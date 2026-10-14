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

/**
 * Stage 6 (transcription-accuracy plan, Phase 4): a stretch of a spoken answer
 * the marker cannot be sure of, built by toSpeakingTranscript
 * (stt/project/spokenText.ts). Token indexes are whitespace-separated words
 * of the turn's `candidateResponse`.
 *
 *  - `nearHomophone`: a Category B word (un/en, ont/sont, le/les…, see
 *    stt/homophones/nearPairs.ts). With two recognisers it is a place where
 *    they disagreed on such a word; with one recogniser every such word is
 *    listed, because nothing confirms it. The candidate gets the benefit of
 *    the doubt there (judgement/homophoneErrors.ts).
 *  - `different`: the recognisers heard clearly different words. The primary
 *    reading is still the marked text; until the STT benchmark, the word is
 *    treated as uncertain like a Category B disagreement
 *    (judgement/homophoneErrors.ts DIFFERENT_WORDS_ARE_UNCERTAIN).
 */
export interface AmbiguousSpan {
  kind: 'nearHomophone' | 'different';
  /** 'disagreement': both recognisers read the answer and differ here. 'single-recogniser': only one reading exists. */
  basis: 'disagreement' | 'single-recogniser';
  /** Token range [start, end) in candidateResponse. start === end: only the second recogniser heard words here. */
  start: number;
  end: number;
  /** candidateResponse's words for the range. */
  heard: string;
  /** What the other recogniser heard here (disagreement), or the word's Category B partners (single recogniser). */
  alternatives: string[];
  /** Category B pair ids (`nearHomophone` only). */
  pairIds: string[];
}

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
  /**
   * Stage 6: uncertain stretches of the spoken response — see AmbiguousSpan.
   * Set by toSpeakingTranscript on spoken tasks (possibly empty); absent on
   * typed answers and hand-authored transcripts.
   */
  ambiguousSpans?: AmbiguousSpan[];
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
  /** Stage 6: uncertain stretches of the spoken response — see RolePlayTaskResponse.ambiguousSpans. */
  ambiguousSpans?: AmbiguousSpan[];
  /**
   * Examiner support recorded for this turn — see ExaminerSupport. Absent for
   * hand-authored transcripts and for further-question turns (turnId
   * 'further1' | 'further2'), which the examiner asks once with no support.
   */
  examinerSupport?: ExaminerSupport;
}

/**
 * Which L2 call a request belongs to (scoring-prompt-v0.6). Role play and
 * Communication are marked in one call; Quality of Language in its own call,
 * so the QoL band is not judged in the same context as Communication. Real
 * providers ignore `kind` (they only send `prompt`); fake judges switch on it.
 */
export type JudgeKind = 'rolePlayCommunication' | 'qualityOfLanguage';

/** Injected LLM seam — no model/temperature/retry in S1. */
export interface JudgeRequest {
  kind: JudgeKind;
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

/**
 * One grammar/vocabulary error the QoL judge listed before choosing a band.
 * `quote` is grounded in that one turn's candidate response only — see
 * judgement/schema.ts::buildTopicTurnCorpora.
 */
export interface QolError {
  source: 'topic1' | 'topic2';
  turnId: string;
  quote: string;
  kind: 'grammar' | 'vocabulary';
  correction: string;
}

/**
 * Stage 6: why the marker excused a QoL error the judge listed
 * (judgement/homophoneErrors.ts) — owner sound-alike rules:
 *  - 'inaudible': the quote and its correction sound the same where they
 *    stand (Category A: il mange / ils mangent, et/est, a/à…). Never penalised.
 *  - 'ambiguousNear': the difference is a Category B pair (un/en, ont/sont…)
 *    at a word the recognisers could not confirm. Benefit of the doubt — but
 *    the feedback still says "this might have been X; make sure you say it".
 *  - 'recognisersDisagree': the two recognisers heard clearly different words
 *    there and the correction is what the other one heard. Owner decision
 *    (2026-10-14): benefit of the doubt until the STT benchmark shows the batch
 *    recogniser can be trusted over the live captions
 *    (judgement/homophoneErrors.ts DIFFERENT_WORDS_ARE_UNCERTAIN).
 */
export type ExcuseReason = 'inaudible' | 'ambiguousNear' | 'recognisersDisagree';

/** A QoL error the marker took out of the counted list, with its reason. */
export interface ExcusedQolError extends QolError {
  reason: ExcuseReason;
  /** The Category B pair ids behind an 'ambiguousNear' excuse; [] otherwise. */
  nearPairIds: string[];
}

/**
 * The booklet's own frequency wordings (Table C, 0520/03/TN, p.12), plus
 * 'no errors'. Recorded as the judge's reading of its error list — never
 * mapped to a band or mark.
 */
export type ErrorFrequency =
  | 'no errors'
  | 'occasional errors'
  | 'some errors'
  | 'frequent errors'
  | 'rarely accurate'
  | 'almost always inaccurate';

export interface QualityOfLanguageAssessment extends BandAssessment {
  errors: QolError[];
  errorFrequency: ErrorFrequency;
}

/** Output of the 'rolePlayCommunication' L2 call. */
export interface RolePlayCommunicationAssessment {
  rolePlay: { tasks: RolePlayTaskMark[]; total: number };
  communication: BandAssessment;
}

export interface SpeakingAssessment {
  rolePlay: { tasks: RolePlayTaskMark[]; total: number };
  communication: BandAssessment;
  qualityOfLanguage: QualityOfLanguageAssessment;
  total: number;
}
