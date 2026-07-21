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
  | 'TRANSITION'
  | 'ADVANCE'
  | 'END';

export type ExaminerTrigger =
  | 'scripted'
  | 'repeat_requested'
  | 'clarification_requested'
  | 'no_response'
  | 'irrelevant_answer'
  | 'failed_repeat'
  | 'below_min_duration'
  | 'extension'
  | 'callback';

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

/**
 * Conduct-only routing hint (Change B), distinct from `intent`. The runtime
 * driver may pass this when the understanding-only interpreter caught a
 * clarification/repeat the deterministic classifier missed on messy STT. It
 * drives the verbatim-REPEAT path but is NEVER written to the ConductLog's
 * candidate `intent` (blanking authority stays the deterministic classifier),
 * so it can never affect the scored transcript — only which action the examiner
 * performs live. Surfaced only as the examiner action's `trigger`, which
 * buildSessionTranscript ignores.
 */
export type ConductHint = 'clarification_request' | 'repeat_request';

export type StepInput =
  | { kind: 'candidateTurn'; result: CandidateTurnResult; conductHint?: ConductHint }
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
  /**
   * Whole-utterance intent classification (C4), app-side debug data like
   * requestedRepeat/relevant. Consumed by buildSessionTranscript to blank
   * repeat_request/non_french text before it reaches the scored transcript —
   * see that file's header for the intentional-coupling note. Never serialized.
   */
  intent?: import('./utteranceIntents').UtteranceIntent;
}

export type ConductLogEntry = ConductLogExaminerEntry | ConductLogCandidateEntry;

export interface ConductLog {
  sessionId: string;
  questionSetId: string;
  entries: ConductLogEntry[];
}

// ── Reducer internal state ────────────────────────────────────────────────────

export type TopicSubState = 'awaitingAnswer' | 'repeated' | 'alternative' | 'secondPart' | 'extending' | 'further';

export interface TopicQuestionState {
  questionId: string;
  subState: TopicSubState;
  /** true once the main question has been offered its one repeat. */
  repeatUsed: boolean;
  /** true once the alternative (if any) has been offered its one repeat. */
  alternativeRepeatUsed: boolean;
  /**
   * true once a two-part question's second part has been offered its one repeat.
   * Distinct from repeatUsed/alternativeRepeatUsed so the 'secondPart' sub-state
   * can only move forward (advance) after one failed second-part repeat — never loop.
   */
  secondPartRepeatUsed: boolean;
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

/**
 * One deterministic, transcript-derived memory of a candidate answer (Change C).
 * Entirely reconstructable from the ConductLog — no LLM output ever writes here,
 * so callbacks are identical across model/provider changes. `verbatimSpan` is a
 * fixed-rule substring of the candidate's transcript (filler-stripped, first
 * content span up to N tokens); `normalizedKey` is its canonicalized form, used
 * for dedupe.
 */
export interface MemoryEntry {
  part: 'topic1' | 'topic2';
  questionId: string | null;
  verbatimSpan: string;
  normalizedKey: string;
}

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
  /**
   * Count of TRANSITION actions emitted so far (C6). Dedicated deterministic key
   * for alternating transition wording — NOT nextSeq parity, since nextSeq is a
   * per-action counter and a single step can now emit multiple actions, making
   * its parity a fragile basis for wording choice.
   */
  transitionCount: number;
  /**
   * Deterministic conversational memory (Change C): capped list of transcript-
   * derived answer spans, appended after each successful topic answer. Scoped and
   * deduped by the callback logic — never an LLM artifact, so replayable from the log.
   */
  conversationMemory: MemoryEntry[];
  /**
   * normalizedKey of the most recently quoted callback (Change C), so a second
   * further-question slot never re-quotes the same span even if no fresher answer
   * qualified in between. null until the first callback is emitted.
   */
  lastCallbackKey: string | null;
  clockS: number;
  nextSeq: number;
}

export interface StepResult {
  state: ConductEngineState;
  actions: ExaminerAction[];
}
