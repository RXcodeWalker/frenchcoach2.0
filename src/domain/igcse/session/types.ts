/**
 * S10 conduct-rule engine types — the ConductLog append-only event model and
 * the pure reducer's state/input/action contracts. Field names are chosen so
 * buildSessionTranscript.ts can map straight onto stt/types.ts without a
 * lossy intermediate step.
 */

import type { SessionPart } from '../stt/types';

// ── Question set (re-exported from stt/types — this IS the S3-defined shape) ──

export type { SessionQuestion, SessionQuestionSet, CandidateInputMode } from '../stt/types';
import type { CandidateInputMode } from '../stt/types';

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
  /** Legacy (session-engine-v3 and earlier): a further question built from the candidate's own words. No longer emitted. */
  | 'callback';

/** One instruction from the reducer to the runtime driver. */
export interface ExaminerAction {
  kind: ExaminerActionKind;
  part: SessionPart;
  /** null for ADVANCE/END and for extension/further prompts with no fixed question anchor. */
  questionId: string | null;
  variant: 'main' | 'alternative' | null;
  /** Text to display/speak; null for ADVANCE (no utterance). END carries the fixed closing line (EXAM_CLOSING_TEXT). */
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
  /**
   * True only for an explicit candidate-initiated skip (the "Skip question" button
   * after a silence prompt) — distinct from a genuine first no-response, which still
   * gets the normal one-time verbatim REPEAT. An explicit skip bypasses that repeat
   * gate entirely and is scored as no answer immediately, since the candidate has
   * already declined to keep trying.
   */
  skipConfirmed?: boolean;
  /** W1: mic vs text field. Optional — absent means 'speech' (every pre-dual-input call site). */
  inputMode?: CandidateInputMode;
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
  | {
      kind: 'candidateTurn';
      result: CandidateTurnResult;
      conductHint?: ConductHint;
      /**
       * Session wall clock (s) at the end of this turn — SimulationSession.getClockS().
       * The 3½-min further-question rule and the 4-min extension cutoff measure how
       * long the conversation lasts, not how long the candidate spoke
       * (exam-conduct §16), so the engine needs the clock, not just the turn's duration.
       */
      clockS: number;
    }
  | { kind: 'clockTick' };

// ── Conduct policy (exam-conduct §24) ─────────────────────────────────────────

/**
 * Exam Sim runs the real 0520 conduct, including its time rules. Coached
 * Practice follows the same script but has no time rules: no further questions
 * and no time-based extension cutoff (exam-conduct §24, D5).
 */
export type ConductMode = 'examSim' | 'coached';

export interface ConductPolicy {
  mode: ConductMode;
}

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
  /** W1: carried from CandidateTurnResult.inputMode onto the Utterance by buildSessionTranscript. */
  inputMode?: CandidateInputMode;
}

export type ConductLogEntry = ConductLogExaminerEntry | ConductLogCandidateEntry;

export interface ConductLog {
  sessionId: string;
  questionSetId: string;
  entries: ConductLogEntry[];
}

// ── Reducer internal state ────────────────────────────────────────────────────

/**
 * 'extending' = an extension prompt has been asked and awaits its answer.
 * 'done' = the question is finished (answered, no extension needed); the engine has moved on.
 */
export type TopicSubState = 'awaitingAnswer' | 'repeated' | 'alternative' | 'secondPart' | 'extending' | 'done';

export interface TopicQuestionState {
  questionId: string;
  subState: TopicSubState;
  /** true once the main question has been offered its one repeat. */
  repeatUsed: boolean;
  /** true once the current alternative part has been offered its one repeat. */
  alternativeRepeatUsed: boolean;
  /**
   * Which part of the alternative question is being asked (exam-conduct §13, D9:
   * `alternativeTexts` holds the alternative's ordered parts). 0 until/unless the
   * alternative is reached.
   */
  alternativePartIndex: number;
  /** true once the pending extension prompt has been offered its one repeat. */
  extensionRepeatUsed: boolean;
  /**
   * Words / seconds of speech across every answered part of this question (main
   * parts, or alternative parts). The extension decision is made on the whole
   * answer, not the last turn (exam-conduct §14).
   */
  answerWords: number;
  answerSpeechS: number;
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
  /**
   * A further question (exam-conduct §15) — its own phase, so it never reads or
   * writes Q5's sub-state (exam-conduct §11). `furtherIndex` indexes
   * questionSet.furtherQuestions[part].
   */
  | { kind: 'further'; part: 'topic1' | 'topic2'; furtherIndex: number; repeatUsed: boolean }
  | { kind: 'complete' };

export interface ConductEngineState {
  /** Fixed at init; stored here so a snapshot restore (W7) keeps the mode. */
  policy: ConductPolicy;
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
  /**
   * Session clock (s) at the step that started each topic — the handling of the
   * previous part's last answer. null until that topic starts. The conversation's
   * length is `clockS - partStartS[part]` (exam-conduct §16, D8).
   */
  partStartS: Record<'topic1' | 'topic2', number | null>;
  /**
   * Count of TRANSITION actions emitted so far (C6). Dedicated deterministic key
   * for alternating transition wording — NOT nextSeq parity, since nextSeq is a
   * per-action counter and a single step can now emit multiple actions, making
   * its parity a fragile basis for wording choice.
   */
  transitionCount: number;
  /** Session clock (s) at the latest candidate turn (StepInput.clockS). */
  clockS: number;
  nextSeq: number;
}

export interface StepResult {
  state: ConductEngineState;
  actions: ExaminerAction[];
}
