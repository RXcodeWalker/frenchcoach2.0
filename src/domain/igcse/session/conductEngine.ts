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
  ConductLogEntry,
  ConductPhase,
  ExaminerAction,
  ExaminerTrigger,
  RolePlayTaskState,
  SessionQuestion,
  SessionQuestionSet,
  StepInput,
  StepResult,
  TopicQuestionState,
} from './types';

/** Below this word count, a candidate turn is treated as a non-answer (S10 scope — no LLM relevance grading). */
export const RELEVANCE_WORD_THRESHOLD = 3;

/** Cambridge 0520 conduct rule: at most 2 examiner-chosen further questions per topic. */
export const MAX_FURTHER_QUESTIONS_PER_TOPIC = 2;

/** Cambridge 0520 conduct rule: target ~4 min candidate speaking per topic; floor that triggers further questions. */
export const TOPIC_SPEAKING_FLOOR_S = 3.5 * 60;

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

export function computeRelevance(result: Pick<CandidateTurnResult, 'didRespond' | 'wordCount'>): boolean {
  return result.didRespond && result.wordCount >= RELEVANCE_WORD_THRESHOLD;
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
    })),
    topic2Questions: topicQuestions(questionSet, 'topic2').map((q) => ({
      questionId: q.questionId,
      subState: 'awaitingAnswer',
      repeatUsed: false,
      alternativeRepeatUsed: false,
    })),
    furtherAskedCount: { topic1: 0, topic2: 0 },
    extensionAskedCount: { topic1: 0, topic2: 0 },
    lastExtensionIndex: null,
    topicSpeakingS: { topic1: 0, topic2: 0 },
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

  if (state.phase.kind === 'rolePlay') {
    return stepRolePlay(questionSet, state, result, relevant);
  }
  if (state.phase.kind === 'topic') {
    return stepTopic(questionSet, state, state.phase.part, state.phase.questionIndex, result, relevant);
  }
  return { state, actions: [] };
}

// ── Role play (5 tasks, in order; never rephrase; no extensions; PAUSE two-part) ──

function stepRolePlay(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  result: CandidateTurnResult,
  relevant: boolean,
): StepResult {
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
      // PAUSE task: part 1 answered, now read part 2 of the same prompt.
      const action = makeAction(nextState, 'READ_MAIN', 'rolePlay', task.questionId, 'main', task.mainText, 'scripted');
      return { state: bumpSeq(nextState), actions: [action] };
    }
    return advanceRolePlay(questionSet, nextState, phase.taskIndex);
  }

  // No response / irrelevant: repeat once (verbatim, never rephrase), then advance.
  if (!taskState.repeatUsed) {
    const updatedTask: RolePlayTaskState = { ...taskState, repeatUsed: true };
    const nextState = replaceRolePlayTask(state, phase.taskIndex, updatedTask);
    const trigger: ExaminerTrigger = result.requestedRepeat
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
  result: CandidateTurnResult,
  relevant: boolean,
): StepResult {
  const questions = topicQuestions(questionSet, part);
  const question = questions[questionIndex];
  const qState = topicQuestionStates(state, part)[questionIndex];

  const speakingS = state.topicSpeakingS[part] + result.responseDurationS;
  const stateWithSpeaking: ConductEngineState = {
    ...state,
    topicSpeakingS: { ...state.topicSpeakingS, [part]: speakingS },
  };

  const didAnswer = result.didRespond && relevant;

  if (qState.subState === 'awaitingAnswer') {
    if (didAnswer) {
      return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    if (!qState.repeatUsed) {
      const updated: TopicQuestionState = { ...qState, subState: 'repeated', repeatUsed: true };
      const nextState = replaceTopicQuestionState(stateWithSpeaking, part, questionIndex, updated);
      const trigger: ExaminerTrigger = result.requestedRepeat
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
      return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    return afterFailedMain(questionSet, stateWithSpeaking, part, questionIndex, question);
  }

  if (qState.subState === 'alternative') {
    if (didAnswer) {
      return moveToExtensionOrAdvance(questionSet, stateWithSpeaking, part, questionIndex, question, result);
    }
    if (!qState.alternativeRepeatUsed) {
      const updated: TopicQuestionState = { ...qState, alternativeRepeatUsed: true };
      const nextState = replaceTopicQuestionState(stateWithSpeaking, part, questionIndex, updated);
      const altText = question.alternativeTexts[0];
      const trigger: ExaminerTrigger = result.requestedRepeat ? 'repeat_requested' : 'failed_repeat';
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
    const decision =
      askedSoFar < MAX_EXTENSIONS_PER_TOPIC ? decideExtension(result, state.lastExtensionIndex) : null;

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
    return advanceTopicQuestion(questionSet, nextState, part, questionIndex);
  }

  return advanceTopicQuestion(questionSet, state, part, questionIndex);
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
    const nextState: ConductEngineState = {
      ...state,
      furtherAskedCount: { ...state.furtherAskedCount, [part]: nextCount },
    };
    const promptText = `Question supplémentaire ${nextCount} : pouvez-vous en dire plus ?`;
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
  const action = makeAction(nextState, 'END', 'topic2', null, null, null, 'scripted');
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
  };
}

export function findQuestionById(questionSet: SessionQuestionSet, questionId: string): SessionQuestion {
  return findQuestion(questionSet, questionId);
}
