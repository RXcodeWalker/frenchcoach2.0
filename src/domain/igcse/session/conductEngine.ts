/**
 * S10 conduct-rule engine — pure reducer over 04 §6.5 / 01 §1.4 examiner
 * conduct rules. No I/O: given current state + one candidate-turn outcome (or
 * a clock tick), returns next state + the examiner actions to perform. The
 * runtime driver (simulationSession.ts) is the only impure caller.
 *
 * Universal conduct policies (repeat-once/never-rephrase, no-extensions-in-
 * role-play, the <=2-further cap, the ~4-min floor) are reducer policy keyed
 * only on `part` — these are fixed Cambridge 0520 rules identical for every
 * question. Alternative-question eligibility is the one data-driven signal
 * (question.alternativeTexts.length > 0), so authored question sets can vary
 * without touching this file. See docs/architecture for the full rationale.
 */

import type {
  CandidateTurnResult,
  ConductEngineState,
  ConductHint,
  ConductLogEntry,
  ConductPhase,
  ExaminerAction,
  ExaminerTrigger,
  MemoryEntry,
  RolePlayTaskState,
  SessionQuestion,
  SessionQuestionSet,
  StepInput,
  StepResult,
  TopicQuestionState,
} from './types';
import type { SessionPart } from '../stt/types';
import { canonicalizeForMatch, normalizeForMatch } from '../text/normalize';
import { stripFillers } from './utteranceIntents';

/** Below this word count, a candidate turn is treated as a non-answer (S10 scope — no LLM relevance grading). */
export const RELEVANCE_WORD_THRESHOLD = 3;

/** Cambridge 0520 conduct rule: at most 2 examiner-chosen further questions per topic. */
export const MAX_FURTHER_QUESTIONS_PER_TOPIC = 2;

/** Cambridge 0520 conduct rule: target ~4 min candidate speaking per topic; floor that triggers further questions. */
export const TOPIC_SPEAKING_FLOOR_S = 3.5 * 60;

/**
 * Cambridge value (~4 min target per topic), but the suppression *behaviour* here
 * (stop offering extension probes once reached) and the metric it's measured against
 * (app-side "accumulated candidate-speaking seconds", a proxy for conversation
 * duration) are both app policy, not a literal Cambridge conduct rule. Scripted
 * Q1-Q5, alternatives, and further-questions are still delivered past this point —
 * only content-aware extension *probing* stops.
 */
export const TOPIC_TARGET_S = 4 * 60;

// ── Extension prompts (realism pass, UNVALIDATED application heuristics) ──
// These thresholds are realism heuristics, not Cambridge mark-scheme numbers.

/** Word count at/above which a candidate turn is treated as a fully developed answer. */
const DEVELOPED_ANSWER_WORDS = 12;
/** Speaking duration (s) at/above which a turn is treated as developed, even if the transcript under-counts words (STT-robust). */
const DEVELOPED_ANSWER_SECONDS = 20;
/**
 * Application heuristic, NOT a Cambridge 0520 conduct rule: Cambridge caps *further
 * questions* at 2 per topic (see MAX_FURTHER_QUESTIONS_PER_TOPIC); this cap on
 * content-aware extension prompts is an app-side realism tunable.
 */
export const MAX_EXTENSIONS_PER_TOPIC = 2;

/**
 * Original app-authored examiner probes (04 §6.5 — extension prompts must be
 * original and must not copy confidential TN wording). Not TN-verbatim; NOT
 * added to UNSOURCED_ALLOWLIST (that is rubric-only). `tu`-register to match
 * the topic questions' direct-address convention.
 */
export const AUTHORIZED_EXTENSION_PROMPTS = ['Donne-moi plus de détails.', 'Peux-tu me dire autre chose à ce sujet ?'] as const;

/**
 * Neutral transition markers (C6, realism pass, UNVALIDATED application heuristic —
 * not a Cambridge conduct rule). Original app-authored examiner acknowledgements
 * spoken between a successfully-answered topic question and the next one, so the
 * exam doesn't read as a bare back-to-back prompt list. Alternated deterministically
 * by ConductEngineState.transitionCount, never by nextSeq parity (see that field's
 * comment). Emitted ONLY at the single success funnel in moveToExtensionOrAdvance —
 * see that function for the leak-proofing rationale.
 */
export const TRANSITION_MARKERS = ["D'accord.", 'Merci.'] as const;

/**
 * Closing line spoken on the exam's final END action (realism pass, UNVALIDATED
 * application heuristic — not a Cambridge conduct rule, same class as
 * TRANSITION_MARKERS). Referenced by docs/architecture/04-frontend-pipeline.md
 * §6.5 as "the closing 'Merci.' that ends the exam"; advanceWithTransition already
 * suppresses a TRANSITION marker immediately before END so this is never doubled.
 */
export const EXAM_CLOSING_TEXT = 'Merci.';

// ── Conversational memory + callbacks (Change C, deterministic) ──────────────

/** Max verbatim tokens kept in a memory span's `verbatimSpan` — enough to quote back, short enough to sidestep gender/number agreement. */
const MEMORY_SPAN_MAX_TOKENS = 6;
/** A span must have at least this many tokens after filler-stripping to qualify as a clean callback anchor (else skip to authored further-question). */
const MEMORY_SPAN_MIN_TOKENS = 2;
/** Cap on the retained conversationMemory list (bounded, per-part dedupe already limits it further). */
const MAX_MEMORY_ENTRIES = 8;

/**
 * Callback templates (Change C). Each quotes the candidate's own verbatim span,
 * so no examiner free text and no gender/number agreement risk. Topic phase only;
 * a callback consumes a further-question slot (see checkFloorOrAdvancePart). Wording
 * audited against docs/architecture/01-cambridge-rubric-source.md — neutral,
 * original, never TN-verbatim, `tu`-register to match the topic questions.
 */
export const CALLBACK_TEMPLATES = [
  'Tu as parlé de « {verbatimSpan} ». Peux-tu développer ?',
  'Tu as mentionné « {verbatimSpan} ». Pourquoi ?',
] as const;

/** Fills a callback template's single `{verbatimSpan}` slot. Kept pure so the wording-provenance test can reconstruct it. */
export function renderCallback(templateIndex: number, verbatimSpan: string): string {
  const template = CALLBACK_TEMPLATES[templateIndex % CALLBACK_TEMPLATES.length];
  return template.replace('{verbatimSpan}', verbatimSpan);
}

/**
 * Deterministic verbatim-span selection from a candidate transcript (Change C):
 * strip leading fillers (same rule as utteranceIntents.stripFillers), take the
 * first content span up to MEMORY_SPAN_MAX_TOKENS tokens. Returns null when no
 * clean span of at least MEMORY_SPAN_MIN_TOKENS tokens survives — the caller then
 * falls back to the authored further-question. No LLM, so identical across providers.
 */
export function selectVerbatimSpan(transcript: string): { verbatimSpan: string; normalizedKey: string } | null {
  const stripped = stripFillers(normalizeForMatch(transcript));
  if (stripped.length === 0) return null;

  const tokens = stripped.split(/\s+/).filter(Boolean).slice(0, MEMORY_SPAN_MAX_TOKENS);
  if (tokens.length < MEMORY_SPAN_MIN_TOKENS) return null;

  const verbatimSpan = tokens.join(' ');
  const normalizedKey = canonicalizeForMatch(verbatimSpan);
  if (normalizedKey.length === 0) return null;

  return { verbatimSpan, normalizedKey };
}

/**
 * Appends a memory entry for a successfully-answered topic turn iff a clean span
 * qualifies AND it isn't a duplicate (by normalizedKey, within the same part).
 * Bounded to MAX_MEMORY_ENTRIES (oldest dropped). Pure; deterministic.
 */
function recordMemory(
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionId: string | null,
  transcript: string,
): ConductEngineState {
  const selected = selectVerbatimSpan(transcript);
  if (!selected) return state;

  const duplicate = state.conversationMemory.some(
    (m) => m.part === part && m.normalizedKey === selected.normalizedKey,
  );
  if (duplicate) return state;

  const entry: MemoryEntry = {
    part,
    questionId,
    verbatimSpan: selected.verbatimSpan,
    normalizedKey: selected.normalizedKey,
  };
  const next = [...state.conversationMemory, entry].slice(-MAX_MEMORY_ENTRIES);
  return { ...state, conversationMemory: next };
}

/**
 * The freshest callback-eligible memory for a further-question slot: the
 * immediately-preceding answer's entry, scoped to the current topic part only
 * (a topic2 callback never references topic1). Returns null when the last entry
 * isn't for this part (recency rule — never reaches back to an arbitrary old turn).
 */
export function latestCallbackFor(state: ConductEngineState, part: 'topic1' | 'topic2'): MemoryEntry | null {
  const last = state.conversationMemory[state.conversationMemory.length - 1];
  if (!last || last.part !== part) return null;
  return last;
}

/**
 * Deterministic decision on whether to ask an extension prompt after a successful
 * answer, and if so which authorized prompt (alternating by index). Returns null
 * when the answer is already developed (skip extension, advance directly).
 */
export function decideExtension(
  result: Pick<CandidateTurnResult, 'wordCount' | 'responseDurationS'>,
  lastIndex: 0 | 1 | null,
): { text: string; index: 0 | 1 } | null {
  const developed =
    result.wordCount >= DEVELOPED_ANSWER_WORDS || result.responseDurationS >= DEVELOPED_ANSWER_SECONDS;
  if (developed) return null;

  const index: 0 | 1 = lastIndex === 0 ? 1 : 0;
  return { text: AUTHORIZED_EXTENSION_PROMPTS[index], index };
}

/**
 * Role play answers are legitimately short (a time, a price, a single item —
 * "un sandwich", "à trois heures") and are never scored for development, so the
 * word-count non-answer gate only applies to topic1/topic2 turns. A role-play
 * turn is relevant whenever the candidate said anything at all.
 */
export function computeRelevance(
  result: Pick<CandidateTurnResult, 'didRespond' | 'wordCount'>,
  part: SessionPart = 'topic1',
): boolean {
  if (!result.didRespond) return false;
  if (part === 'rolePlay') return true;
  return result.wordCount >= RELEVANCE_WORD_THRESHOLD;
}

/**
 * Deterministic choice of transition marker text, alternating on transitionCount
 * (never nextSeq parity — see that field's comment). Pure; the caller
 * (moveToExtensionOrAdvance's success funnel) decides WHETHER to transition.
 */
function decideTransition(transitionCount: number): string {
  return TRANSITION_MARKERS[transitionCount % TRANSITION_MARKERS.length];
}

function rolePlayQuestions(questionSet: SessionQuestionSet): SessionQuestion[] {
  return questionSet.questions.filter((q) => q.part === 'rolePlay');
}

function topicQuestions(questionSet: SessionQuestionSet, part: 'topic1' | 'topic2'): SessionQuestion[] {
  return questionSet.questions.filter((q) => q.part === part);
}

function findQuestion(questionSet: SessionQuestionSet, questionId: string): SessionQuestion {
  const q = questionSet.questions.find((question) => question.questionId === questionId);
  if (!q) throw new Error(`conductEngine: unknown questionId "${questionId}"`);
  return q;
}

export function initConductEngineState(questionSet: SessionQuestionSet): ConductEngineState {
  const rpQuestions = rolePlayQuestions(questionSet);
  if (rpQuestions.length === 0) throw new Error('conductEngine: questionSet has no rolePlay questions');

  return {
    phase: { kind: 'rolePlay', taskIndex: 0 },
    rolePlayTasks: rpQuestions.map((q) => ({
      questionId: q.questionId,
      partsExpected: q.partsExpected ?? 1,
      partsAddressed: 0,
      repeatUsed: false,
    })),
    topic1Questions: topicQuestions(questionSet, 'topic1').map((q) => ({
      questionId: q.questionId,
      subState: 'awaitingAnswer',
      repeatUsed: false,
      alternativeRepeatUsed: false,
      secondPartRepeatUsed: false,
    })),
    topic2Questions: topicQuestions(questionSet, 'topic2').map((q) => ({
      questionId: q.questionId,
      subState: 'awaitingAnswer',
      repeatUsed: false,
      alternativeRepeatUsed: false,
      secondPartRepeatUsed: false,
    })),
    furtherAskedCount: { topic1: 0, topic2: 0 },
    extensionAskedCount: { topic1: 0, topic2: 0 },
    lastExtensionIndex: null,
    topicSpeakingS: { topic1: 0, topic2: 0 },
    transitionCount: 0,
    conversationMemory: [],
    lastCallbackKey: null,
    clockS: 0,
    nextSeq: 1,
  };
}

/**
 * Kicks off the session: emits the first READ_MAIN action (role play task 1
 * part 1). Call once before any step().
 */
export function startConduct(questionSet: SessionQuestionSet, state: ConductEngineState): StepResult {
  const rpQuestions = rolePlayQuestions(questionSet);
  const firstTask = rpQuestions[0];
  const action = makeAction(state, 'READ_MAIN', 'rolePlay', firstTask.questionId, 'main', firstTask.mainText, 'scripted');
  return { state: bumpSeq(state), actions: [action] };
}

function bumpSeq(state: ConductEngineState): ConductEngineState {
  return { ...state, nextSeq: state.nextSeq + 1 };
}

function makeAction(
  state: ConductEngineState,
  kind: ExaminerAction['kind'],
  part: ExaminerAction['part'],
  questionId: string | null,
  variant: ExaminerAction['variant'],
  text: string | null,
  trigger: ExaminerTrigger,
): ExaminerAction {
  void state;
  return { kind, part, questionId, variant, text, trigger };
}

/**
 * Advances the engine one step given a candidate-turn outcome. This is the
 * only entry point the runtime driver calls after the candidate's turn ends;
 * clock-only ticks (StepInput.kind === 'clockTick') are folded into the same
 * function so the 4-min-floor check has one code path.
 */
export function step(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  input: StepInput,
): StepResult {
  if (input.kind === 'clockTick') {
    return { state, actions: [] };
  }

  const result = input.result;
  const relevant = result.relevant;
  const conductHint = input.conductHint;

  if (state.phase.kind === 'rolePlay') {
    return stepRolePlay(questionSet, state, result, relevant, conductHint);
  }
  if (state.phase.kind === 'topic') {
    return stepTopic(questionSet, state, state.phase.part, state.phase.questionIndex, result, relevant, conductHint);
  }
  return { state, actions: [] };
}

/**
 * Clarification/repeat conduct-hint (Change B): the LLM caught a meta-utterance
 * the deterministic classifier missed on messy STT. Authentic Cambridge —
 * clarification is answered with a verbatim REPEAT, never an explanation. This
 * treats the hinted turn as a non-answer so it routes to the engine's existing
 * verbatim-REPEAT path, while carrying a distinct trigger.
 *
 * The `requestedRepeat: true` set here is on a LOCAL COPY consumed only by this
 * reducer's own trigger derivation (so a repeat_request hint reads 'repeat_requested'
 * via the engine's existing `result.requestedRepeat` branch) — it is a different
 * object from the CandidateTurnResult the runtime driver already logged via
 * candidateTurnToLogEntry BEFORE calling step(). It NEVER touches the candidate log
 * entry's `requestedRepeat` or `intent` fields (those stay the deterministic
 * classifier's job, written by the caller from the ORIGINAL result/transcript).
 */
function applyConductHint(result: CandidateTurnResult, hint: ConductHint | undefined): {
  result: CandidateTurnResult;
  relevant: boolean;
  clarificationTrigger: boolean;
} {
  if (hint === undefined) {
    return { result, relevant: result.relevant, clarificationTrigger: false };
  }
  // Force the non-answer repeat path; a clarification carries the distinct trigger below.
  return {
    result: { ...result, didRespond: false, requestedRepeat: hint === 'repeat_request' ? true : result.requestedRepeat },
    relevant: false,
    clarificationTrigger: hint === 'clarification_request',
  };
}

// ── Role play (5 tasks, in order; never rephrase; no extensions; PAUSE two-part) ──

function stepRolePlay(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  rawResult: CandidateTurnResult,
  rawRelevant: boolean,
  hint?: ConductHint,
): StepResult {
  const { result, relevant, clarificationTrigger } = applyConductHint(
    { ...rawResult, relevant: rawRelevant },
    hint,
  );
  const phase = state.phase as Extract<ConductPhase, { kind: 'rolePlay' }>;
  const rpQuestions = rolePlayQuestions(questionSet);
  const task = rpQuestions[phase.taskIndex];
  const taskState = state.rolePlayTasks[phase.taskIndex];

  const didAnswer = result.didRespond && relevant;

  if (didAnswer) {
    const partsAddressed = Math.min(2, taskState.partsAddressed + 1) as 0 | 1 | 2;
    const updatedTask: RolePlayTaskState = { ...taskState, partsAddressed, repeatUsed: false };
    const nextState = replaceRolePlayTask(state, phase.taskIndex, updatedTask);

    if (task.partsExpected === 2 && partsAddressed < 2) {
      // PAUSE task: part 1 answered, now read the DISTINCT part-2 prompt (never a
      // re-read of mainText). secondPartText is required on any partsExpected:2 task.
      const secondPartText = task.secondPartText ?? task.mainText;
      const action = makeAction(nextState, 'READ_MAIN', 'rolePlay', task.questionId, 'main', secondPartText, 'scripted');
      return { state: bumpSeq(nextState), actions: [action] };
    }
    return advanceRolePlay(questionSet, nextState, phase.taskIndex);
  }

  // No response / irrelevant / clarification: repeat once (verbatim, never rephrase
  // and never explain — authentic Cambridge), then advance. An explicit skip bypasses
  // this gate — the candidate already declined to keep trying.
  if (!taskState.repeatUsed && !result.skipConfirmed) {
    const updatedTask: RolePlayTaskState = { ...taskState, repeatUsed: true };
    const nextState = replaceRolePlayTask(state, phase.taskIndex, updatedTask);
    const trigger: ExaminerTrigger = clarificationTrigger
      ? 'clarification_requested'
      : result.requestedRepeat
        ? 'repeat_requested'
        : result.didRespond
          ? 'irrelevant_answer'
          : 'no_response';
    const action = makeAction(nextState, 'REPEAT', 'rolePlay', task.questionId, 'main', task.mainText, trigger);
    return { state: bumpSeq(nextState), actions: [action] };
  }

  // Failed repeat: advance regardless of partsAddressed (§6.5: move on after one repeat).
  return advanceRolePlay(questionSet, state, phase.taskIndex);
}

function replaceRolePlayTask(
  state: ConductEngineState,
  index: number,
  updated: RolePlayTaskState,
): ConductEngineState {
  const rolePlayTasks = state.rolePlayTasks.slice();
  rolePlayTasks[index] = updated;
  return { ...state, rolePlayTasks };
}

function advanceRolePlay(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  taskIndex: number,
): StepResult {
  const rpQuestions = rolePlayQuestions(questionSet);
  const nextIndex = taskIndex + 1;

  if (nextIndex >= rpQuestions.length) {
    return startTopic(questionSet, { ...state, phase: { kind: 'topic', part: 'topic1', questionIndex: 0 } });
  }

  const nextTask = rpQuestions[nextIndex];
  const nextState: ConductEngineState = { ...state, phase: { kind: 'rolePlay', taskIndex: nextIndex } };
  const action = makeAction(nextState, 'READ_MAIN', 'rolePlay', nextTask.questionId, 'main', nextTask.mainText, 'scripted');
  return { state: bumpSeq(nextState), actions: [action] };
}

// ── Topic conversations (Q1-Q5, alternatives, extension, further-question, 4-min floor) ──

function topicQuestionStates(state: ConductEngineState, part: 'topic1' | 'topic2'): TopicQuestionState[] {
  return part === 'topic1' ? state.topic1Questions : state.topic2Questions;
}

function replaceTopicQuestionState(
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  index: number,
  updated: TopicQuestionState,
): ConductEngineState {
  const list = topicQuestionStates(state, part).slice();
  list[index] = updated;
  return part === 'topic1' ? { ...state, topic1Questions: list } : { ...state, topic2Questions: list };
}

function startTopic(questionSet: SessionQuestionSet, state: ConductEngineState): StepResult {
  const phase = state.phase as Extract<ConductPhase, { kind: 'topic' }>;
  const questions = topicQuestions(questionSet, phase.part);
  const q = questions[phase.questionIndex];
  const action = makeAction(state, 'READ_MAIN', phase.part, q.questionId, 'main', q.mainText, 'scripted');
  return { state: bumpSeq(state), actions: [action] };
}

function stepTopic(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
  rawResult: CandidateTurnResult,
  rawRelevant: boolean,
  hint?: ConductHint,
): StepResult {
  const { result, relevant, clarificationTrigger } = applyConductHint(
    { ...rawResult, relevant: rawRelevant },
    hint,
  );
  const questions = topicQuestions(questionSet, part);
  const question = questions[questionIndex];
  const qState = topicQuestionStates(state, part)[questionIndex];

  const speakingS = state.topicSpeakingS[part] + result.responseDurationS;
  const baseWithSpeaking: ConductEngineState = {
    ...state,
    topicSpeakingS: { ...state.topicSpeakingS, [part]: speakingS },
  };

  const didAnswer = result.didRespond && relevant;

  // Deterministic conversational memory (Change C): record every successful
  // topic answer's transcript-derived span. Recorded from the ORIGINAL (raw)
  // transcript — a conduct-hinted turn is forced to didAnswer=false above, so it
  // never reaches here; only genuine substantive answers land in memory.
  const stateWithSpeaking: ConductEngineState = didAnswer
    ? recordMemory(baseWithSpeaking, part, question.questionId, result.transcript)
    : baseWithSpeaking;

  if (qState.subState === 'awaitingAnswer') {
    if (didAnswer) {
      return moveToSecondPartOrExtension(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    if (!qState.repeatUsed && !result.skipConfirmed) {
      const updated: TopicQuestionState = { ...qState, subState: 'repeated', repeatUsed: true };
      const nextState = replaceTopicQuestionState(stateWithSpeaking, part, questionIndex, updated);
      const trigger: ExaminerTrigger = clarificationTrigger
        ? 'clarification_requested'
        : result.requestedRepeat
          ? 'repeat_requested'
          : result.didRespond
            ? 'irrelevant_answer'
            : 'no_response';
      const action = makeAction(nextState, 'REPEAT', part, question.questionId, 'main', question.mainText, trigger);
      return { state: bumpSeq(nextState), actions: [action] };
    }
    return afterFailedMain(questionSet, stateWithSpeaking, part, questionIndex, question);
  }

  if (qState.subState === 'repeated') {
    if (didAnswer) {
      return moveToSecondPartOrExtension(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    return afterFailedMain(questionSet, stateWithSpeaking, part, questionIndex, question);
  }

  if (qState.subState === 'secondPart') {
    // Second part answered (or its one repeat exhausted): the alternative is NEVER
    // offered for a second part — funnel straight to extension/advance.
    if (didAnswer) {
      return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    if (!qState.secondPartRepeatUsed && !result.skipConfirmed) {
      const updated: TopicQuestionState = { ...qState, secondPartRepeatUsed: true };
      const nextState = replaceTopicQuestionState(stateWithSpeaking, part, questionIndex, updated);
      const secondPartText = question.secondPartText ?? question.mainText;
      const trigger: ExaminerTrigger = clarificationTrigger
        ? 'clarification_requested'
        : result.requestedRepeat
          ? 'repeat_requested'
          : result.didRespond
            ? 'irrelevant_answer'
            : 'no_response';
      const action = makeAction(nextState, 'REPEAT', part, question.questionId, 'main', secondPartText, trigger);
      return { state: bumpSeq(nextState), actions: [action] };
    }
    // Failed second-part repeat: advance (like a failed main — no extension probe on a failure).
    return advanceTopicQuestion(questionSet, stateWithSpeaking, part, questionIndex);
  }

  if (qState.subState === 'alternative') {
    if (didAnswer) {
      return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    if (!qState.alternativeRepeatUsed && !result.skipConfirmed) {
      const updated: TopicQuestionState = { ...qState, alternativeRepeatUsed: true };
      const nextState = replaceTopicQuestionState(stateWithSpeaking, part, questionIndex, updated);
      const altText = question.alternativeTexts[0];
      const trigger: ExaminerTrigger = clarificationTrigger
        ? 'clarification_requested'
        : result.requestedRepeat
          ? 'repeat_requested'
          : 'failed_repeat';
      const action = makeAction(nextState, 'REPEAT', part, question.questionId, 'alternative', altText, trigger);
      return { state: bumpSeq(nextState), actions: [action] };
    }
    return advanceTopicQuestion(questionSet, stateWithSpeaking, part, questionIndex);
  }

  // 'extending' / 'further' handled by extension/further-question flow below.
  return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
}

/** After the main question fails its one repeat: offer the alternative iff data-driven eligibility, else advance. */
function afterFailedMain(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
  question: SessionQuestion,
): StepResult {
  if (question.alternativeTexts.length > 0) {
    const qState = topicQuestionStates(state, part)[questionIndex];
    const updated: TopicQuestionState = { ...qState, subState: 'alternative' };
    const nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
    const action = makeAction(
      nextState,
      'READ_ALTERNATIVE',
      part,
      question.questionId,
      'alternative',
      question.alternativeTexts[0],
      'failed_repeat',
    );
    return { state: bumpSeq(nextState), actions: [action] };
  }
  return advanceTopicQuestion(questionSet, state, part, questionIndex);
}

/**
 * After a successful MAIN answer: if the question is two-part, deliver the distinct
 * second-part prompt and enter the 'secondPart' sub-state (C3). Otherwise fall through
 * to the extension/advance funnel. Only reached from the awaitingAnswer/repeated success
 * branches — a question answered via its ALTERNATIVE bypasses this (the alternative
 * replaces the two-part main question, so its second part is never asked).
 */
function moveToSecondPartOrExtension(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
  question: SessionQuestion,
  result: CandidateTurnResult,
): StepResult {
  const qState = topicQuestionStates(state, part)[questionIndex];

  if (question.secondPartText && qState.subState !== 'secondPart') {
    const updated: TopicQuestionState = { ...qState, subState: 'secondPart' };
    const nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
    // Same questionId, second emission — event kind stays main_question.
    const action = makeAction(nextState, 'READ_MAIN', part, question.questionId, 'main', question.secondPartText, 'scripted');
    return { state: bumpSeq(nextState), actions: [action] };
  }

  return moveToExtensionOrAdvance(questionSet, state, part, questionIndex, question, result);
}

/**
 * After a successful answer: decide whether a content-aware extension prompt is
 * warranted (Finding 1). A developed answer, an exhausted per-topic extension cap,
 * or a subState already past 'extending' all skip straight to advance.
 */
function moveToExtensionOrAdvance(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
  question: SessionQuestion,
  result: CandidateTurnResult,
): StepResult {
  const qState = topicQuestionStates(state, part)[questionIndex];

  if (qState.subState !== 'extending') {
    const askedSoFar = state.extensionAskedCount[part];
    const pastTarget = state.topicSpeakingS[part] >= TOPIC_TARGET_S;
    const decision =
      askedSoFar < MAX_EXTENSIONS_PER_TOPIC && !pastTarget
        ? decideExtension(result, state.lastExtensionIndex)
        : null;

    if (decision) {
      const updated: TopicQuestionState = { ...qState, subState: 'extending' };
      let nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
      nextState = {
        ...nextState,
        extensionAskedCount: { ...nextState.extensionAskedCount, [part]: askedSoFar + 1 },
        lastExtensionIndex: decision.index,
      };
      const action = makeAction(nextState, 'EXTENSION_PROMPT', part, question.questionId, null, decision.text, 'extension');
      return { state: bumpSeq(nextState), actions: [action] };
    }

    // Developed answer or cap reached: mark 'extending' so a repeated call doesn't re-decide, then advance.
    const updated: TopicQuestionState = { ...qState, subState: 'extending' };
    const nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
    return advanceWithTransition(questionSet, nextState, part, questionIndex);
  }

  return advanceWithTransition(questionSet, state, part, questionIndex);
}

/**
 * C6: prepends a neutral TRANSITION marker before the advance action, ONLY at this
 * single success funnel (both call sites are inside moveToExtensionOrAdvance, reached
 * exclusively after a successfully-answered question — main, second-part, or
 * alternative). Deliberately NOT called from advanceTopicQuestion/checkFloorOrAdvancePart/
 * advancePart directly, nor from afterFailedMain — those are also reached from failure
 * paths (failed repeat, failed alternative, failed second-part repeat), and a transition
 * placed there would leak onto a failure. Suppressed when the funnel's own advance
 * would emit END (a closing "Merci." from the END action itself is enough; see F2/Review B).
 */
function advanceWithTransition(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
): StepResult {
  const text = decideTransition(state.transitionCount);
  const nextState: ConductEngineState = { ...state, transitionCount: state.transitionCount + 1 };
  const transitionAction = makeAction(nextState, 'TRANSITION', part, null, null, text, 'scripted');

  const advanced = advanceTopicQuestion(questionSet, bumpSeq(nextState), part, questionIndex);

  if (advanced.actions.length === 1 && advanced.actions[0].kind === 'END') {
    // Final handoff: a closing "Merci." rides on the END action itself — don't double it.
    return { state: advanced.state, actions: advanced.actions };
  }

  return { state: advanced.state, actions: [transitionAction, ...advanced.actions] };
}

function advanceTopicQuestion(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
  questionIndex: number,
): StepResult {
  const questions = topicQuestions(questionSet, part);
  const nextIndex = questionIndex + 1;

  if (nextIndex < questions.length) {
    const nextState: ConductEngineState = { ...state, phase: { kind: 'topic', part, questionIndex: nextIndex } };
    const nextQuestion = questions[nextIndex];
    const action = makeAction(nextState, 'READ_MAIN', part, nextQuestion.questionId, 'main', nextQuestion.mainText, 'scripted');
    return { state: bumpSeq(nextState), actions: [action] };
  }

  // All scripted Q1-Q5 (+ alternatives) exhausted: 4-min floor check.
  return checkFloorOrAdvancePart(questionSet, state, part);
}

function checkFloorOrAdvancePart(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
): StepResult {
  const speakingS = state.topicSpeakingS[part];
  const askedSoFar = state.furtherAskedCount[part];

  if (speakingS < TOPIC_SPEAKING_FLOOR_S && askedSoFar < MAX_FURTHER_QUESTIONS_PER_TOPIC) {
    const nextCount = askedSoFar + 1;

    // Change C: a fresh, non-reused callback quoting the candidate's own words
    // consumes this further-question slot; otherwise fall back to the authored
    // on-topic further-question (skip-if-empty). Callback quotes a verbatim span,
    // so no examiner free text and no agreement risk. Deterministic either way.
    const callback = latestCallbackFor(state, part);
    const callbackFresh = callback !== null && callback.normalizedKey !== state.lastCallbackKey;

    if (callbackFresh && callback) {
      const nextState: ConductEngineState = {
        ...state,
        furtherAskedCount: { ...state.furtherAskedCount, [part]: nextCount },
        lastCallbackKey: callback.normalizedKey,
      };
      const promptText = renderCallback(askedSoFar, callback.verbatimSpan);
      const action = makeAction(nextState, 'FURTHER_QUESTION', part, null, null, promptText, 'callback');
      return { state: bumpSeq(nextState), actions: [action] };
    }

    const nextState: ConductEngineState = {
      ...state,
      furtherAskedCount: { ...state.furtherAskedCount, [part]: nextCount },
    };
    const promptText = questionSet.furtherQuestions[part][askedSoFar];
    const action = makeAction(nextState, 'FURTHER_QUESTION', part, null, null, promptText, 'below_min_duration');
    return { state: bumpSeq(nextState), actions: [action] };
  }

  return advancePart(questionSet, state, part);
}

function advancePart(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: 'topic1' | 'topic2',
): StepResult {
  if (part === 'topic1') {
    const nextState: ConductEngineState = { ...state, phase: { kind: 'topic', part: 'topic2', questionIndex: 0 } };
    return startTopic(questionSet, nextState);
  }

  const nextState: ConductEngineState = { ...state, phase: { kind: 'complete' } };
  const action = makeAction(nextState, 'END', 'topic2', null, null, EXAM_CLOSING_TEXT, 'scripted');
  return { state: bumpSeq(nextState), actions: [action] };
}

// ── ConductLog helpers ─────────────────────────────────────────────────────────

/** Converts one examiner ExaminerAction into a ConductLogExaminerEntry, given the current clock. */
export function examinerActionToLogEntry(
  action: ExaminerAction,
  seq: number,
  atS: number,
): ConductLogEntry {
  return {
    kind: 'examiner',
    seq,
    atS,
    part: action.part,
    action: action.kind,
    questionId: action.questionId,
    variant: action.variant,
    text: action.text ?? '',
    trigger: action.trigger,
  };
}

/** Converts one candidate turn into a ConductLogCandidateEntry, given the current clock and question context. */
export function candidateTurnToLogEntry(
  result: CandidateTurnResult,
  seq: number,
  startS: number,
  part: import('../stt/types').SessionPart,
  questionId: string | null,
  relevant: boolean,
  intent?: import('./utteranceIntents').UtteranceIntent,
): ConductLogEntry {
  return {
    kind: 'candidate',
    seq,
    startS,
    endS: startS + result.responseDurationS,
    part,
    questionId,
    transcript: result.transcript,
    wordCount: result.wordCount,
    requestedRepeat: result.requestedRepeat,
    relevant,
    intent,
  };
}

export function findQuestionById(questionSet: SessionQuestionSet, questionId: string): SessionQuestion {
  return findQuestion(questionSet, questionId);
}
