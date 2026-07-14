/**
 * S10 conduct-rule engine types — the ConductLog append-only event model and
 * the pure reducer's state/input/action contracts. Field names are chosen so
 * buildSessionTranscript.ts can map straight onto stt/types.ts without a
 * lossy intermediate step.
 */

import type { SessionPart } from '../stt/types';

// ── Question set (re-exported from stt/types — this IS the S3-defined shape) ──

export type { SessionQuestion, SessionQuestionSet } from '../stt/types';

// ── Examiner actions ──────────────────────────────────────────────────────────

export type ExaminerActionKind =
  | 'READ_MAIN'
  | 'REPEAT'
  | 'READ_ALTERNATIVE'
  | 'EXTENSION_PROMPT'
  | 'FURTHER_QUESTION'
  | 'ADVANCE'
  | 'END';

export type ExaminerTrigger =
  | 'scripted'
  | 'repeat_requested'
  | 'no_response'
  | 'irrelevant_answer'
  | 'failed_repeat'
  | 'below_min_duration'
  | 'extension';

/** One instruction from the reducer to the runtime driver. */
export interface ExaminerAction {
  kind: ExaminerActionKind;
  part: SessionPart;
  /** null for ADVANCE/END and for extension/further prompts with no fixed question anchor. */
  questionId: string | null;
  variant: 'main' | 'alternative' | null;
  /** Text to display/speak; null for ADVANCE/END (no utterance). */
  text: string | null;
  trigger: ExaminerTrigger;
}

// ── Candidate turn input ──────────────────────────────────────────────────────

/** What the runtime driver reports back to the reducer after a candidate turn. */
export interface CandidateTurnResult {
  didRespond: boolean;
  /** Deterministic heuristic result (S10 scope) — see conductEngine RELEVANCE_WORD_THRESHOLD. */
  relevant: boolean;
  transcript: string;
  wordCount: number;
  responseDurationS: number;
  requestedRepeat: boolean;
}

export type StepInput =
  | { kind: 'candidateTurn'; result: CandidateTurnResult }
  | { kind: 'clockTick' };

// ── ConductLog (append-only, durable debug/replay artifact) ───────────────────

export interface ConductLogExaminerEntry {
  kind: 'examiner';
  seq: number;
  atS: number;
  part: SessionPart;
  action: ExaminerActionKind;
  questionId: string | null;
  variant: 'main' | 'alternative' | null;
  text: string;
  trigger: ExaminerTrigger;
}

export interface ConductLogCandidateEntry {
  kind: 'candidate';
  seq: number;
  startS: number;
  endS: number;
  part: SessionPart;
  questionId: string | null;
  transcript: string;
  wordCount: number;
  requestedRepeat: boolean;
  relevant: boolean;
}

export type ConductLogEntry = ConductLogExaminerEntry | ConductLogCandidateEntry;

export interface ConductLog {
  sessionId: string;
  questionSetId: string;
  entries: ConductLogEntry[];
}

// ── Reducer internal state ────────────────────────────────────────────────────

export type TopicSubState = 'awaitingAnswer' | 'repeated' | 'alternative' | 'extending' | 'further';

export interface TopicQuestionState {
  questionId: string;
  subState: TopicSubState;
  /** true once the main question has been offered its one repeat. */
  repeatUsed: boolean;
  /** true once the alternative (if any) has been offered its one repeat. */
  alternativeRepeatUsed: boolean;
}

export interface RolePlayTaskState {
  questionId: string;
  partsExpected: 1 | 2;
  partsAddressed: 0 | 1 | 2;
  repeatUsed: boolean;
}

export type ConductPhase =
  | { kind: 'rolePlay'; taskIndex: number }
  | { kind: 'topic'; part: 'topic1' | 'topic2'; questionIndex: number }
  | { kind: 'complete' };

export interface ConductEngineState {
  phase: ConductPhase;
  rolePlayTasks: RolePlayTaskState[];
  topic1Questions: TopicQuestionState[];
  topic2Questions: TopicQuestionState[];
  /** furtherAskedCount keyed by topic part. */
  furtherAskedCount: Record<'topic1' | 'topic2', number>;
  /** Content-aware extensions asked so far, keyed by topic part (Finding 1 per-topic cap). */
  extensionAskedCount: Record<'topic1' | 'topic2', number>;
  /** Index into AUTHORIZED_EXTENSION_PROMPTS of the most recently asked extension, so successive extensions alternate. */
  lastExtensionIndex: 0 | 1 | null;
  /** Accumulated candidate speaking seconds, keyed by topic part (4-min floor). */
  topicSpeakingS: Record<'topic1' | 'topic2', number>;
  clockS: number;
  nextSeq: number;
}

export interface StepResult {
  state: ConductEngineState;
  actions: ExaminerAction[];
}
