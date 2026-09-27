/**
 * S10 conduct-rule engine — pure reducer over the Cambridge 0520/03 examiner
 * conduct rules in docs/systems/exam-conduct-0520.md (cited as
 * "exam-conduct §N"). No I/O: given current state + one candidate-turn outcome
 * (with the session clock), returns next state + the examiner actions to
 * perform. The runtime driver (simulationSession.ts) is the only impure caller.
 *
 * Universal conduct rules (repeat-once/never-rephrase, no alternatives or
 * extensions in role play, alternatives only from Q3, the <=2-further cap, the
 * 3½-min floor) are reducer policy keyed on `part` and question position —
 * fixed 0520 rules identical for every question. Which questions have
 * alternatives or second parts is data (alternativeTexts, secondPartText).
 * The ConductPolicy (exam-conduct §24) switches the time rules off in Coached
 * Practice.
 */

import type {
  CandidateTurnResult,
  ConductEngineState,
  ConductHint,
  ConductLogEntry,
  ConductPhase,
  ConductPolicy,
  ExaminerAction,
  ExaminerTrigger,
  RolePlayTaskState,
  SessionQuestion,
  SessionQuestionSet,
  StepInput,
  StepResult,
  TopicQuestionState,
} from './types';
import type { SessionPart } from '../stt/types';

type TopicPart = 'topic1' | 'topic2';

/** Below this word count, a candidate turn is treated as a non-answer (S10 scope — no LLM relevance grading). */
export const RELEVANCE_WORD_THRESHOLD = 1;

/** Cambridge 0520 conduct rule: at most 2 further questions per topic (exam-conduct §15, TN p.3). */
export const MAX_FURTHER_QUESTIONS_PER_TOPIC = 2;

/**
 * Cambridge 0520 conduct rule: a topic conversation lasting 3½ minutes or less
 * (after extension questions) gets up to 2 further questions (exam-conduct §15,
 * TN p.3). Measured as the conversation's wall-clock length, not the candidate's
 * speaking time (exam-conduct §16). Exam Sim only.
 */
export const TOPIC_FURTHER_QUESTION_FLOOR_S = 3.5 * 60;

/**
 * Cambridge value (4 min per topic, TN p.3), but the behaviour keyed on it —
 * stop offering extension prompts once a conversation has lasted this long — is
 * app policy, not a Cambridge rule (exam-conduct §17). Wall-clock, Exam Sim only.
 * Scripted Q1-Q5, alternatives and further questions are still delivered past it.
 */
export const TOPIC_TARGET_S = 4 * 60;

/**
 * 0520 conduct rule: alternatives exist only for Q3-Q5 (TN p.7/p.8 table,
 * exam-conduct §12-§13). Zero-based question index from which a failed question
 * may be given its alternative; an alternative authored on Q1-Q2 is never asked.
 */
export const FIRST_ALTERNATIVE_QUESTION_INDEX = 2;

// ── Extension prompts (exam-conduct §14; UNVALIDATED application heuristics) ──
// The notes give no length threshold for "answers very briefly" (TN p.7 #15).

/** Word count at/above which the whole answer to a question is treated as developed. */
const DEVELOPED_ANSWER_WORDS = 12;
/** Speech seconds at/above which the whole answer is treated as developed, even if the transcript under-counts words (STT-robust). */
const DEVELOPED_ANSWER_SECONDS = 20;
/**
 * Application heuristic, NOT a Cambridge 0520 conduct rule: Cambridge caps *further
 * questions* at 2 per topic (see MAX_FURTHER_QUESTIONS_PER_TOPIC); this cap on
 * extension prompts is an app-side realism tunable.
 */
export const MAX_EXTENSIONS_PER_TOPIC = 2;

/**
 * The extension prompts are the notes' own example extension questions (TN p.7,
 * p.8) — conduct prompts, not question-script wording (exam-conduct §14, D16).
 * NOT added to UNSOURCED_ALLOWLIST (that is rubric-only).
 */
export const AUTHORIZED_EXTENSION_PROMPTS = ['Donne-moi plus de détails.', 'Peux-tu me dire autre chose à ce sujet ?'] as const;

/**
 * Neutral acknowledgements (exam-conduct §18: acknowledge each answer, TN p.7 #14).
 * Original app wording (UNVALIDATED application heuristic), spoken between an
 * answered topic question and the next prompt. Alternated deterministically by
 * ConductEngineState.transitionCount, never by nextSeq parity (see that field's
 * comment). Emitted only by advanceWithTransition — see there.
 */
export const TRANSITION_MARKERS = ["D'accord.", 'Merci.'] as const;

/**
 * Closing line spoken on the exam's final END action (UNVALIDATED application
 * heuristic — not a Cambridge conduct rule, same class as TRANSITION_MARKERS).
 * advanceWithTransition suppresses a TRANSITION immediately before END so this is
 * never doubled.
 */
export const EXAM_CLOSING_TEXT = 'Merci.';

/** Default policy: the real exam's conduct (exam-conduct §24). */
export const EXAM_SIM_POLICY: ConductPolicy = { mode: 'examSim' };

/**
 * Deterministic decision on whether to ask an extension prompt after an answered
 * question, and if so which authorized prompt (alternating by index). `result`
 * is the WHOLE answer to the question — every answered part summed — never just
 * the last turn (exam-conduct §14). Returns null when the answer is developed.
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
 * (advanceWithTransition) decides WHETHER to transition.
 */
function decideTransition(transitionCount: number): string {
  return TRANSITION_MARKERS[transitionCount % TRANSITION_MARKERS.length];
}

function rolePlayQuestions(questionSet: SessionQuestionSet): SessionQuestion[] {
  return questionSet.questions.filter((q) => q.part === 'rolePlay');
}

function topicQuestions(questionSet: SessionQuestionSet, part: TopicPart): SessionQuestion[] {
  return questionSet.questions.filter((q) => q.part === part);
}

function findQuestion(questionSet: SessionQuestionSet, questionId: string): SessionQuestion {
  const q = questionSet.questions.find((question) => question.questionId === questionId);
  if (!q) throw new Error(`conductEngine: unknown questionId "${questionId}"`);
  return q;
}

function initialTopicQuestionState(q: SessionQuestion): TopicQuestionState {
  return {
    questionId: q.questionId,
    subState: 'awaitingAnswer',
    repeatUsed: false,
    alternativeRepeatUsed: false,
    alternativePartIndex: 0,
    secondPartRepeatUsed: false,
    extensionRepeatUsed: false,
    answerWords: 0,
    answerSpeechS: 0,
  };
}

export function initConductEngineState(
  questionSet: SessionQuestionSet,
  policy: ConductPolicy = EXAM_SIM_POLICY,
): ConductEngineState {
  const rpQuestions = rolePlayQuestions(questionSet);
  if (rpQuestions.length === 0) throw new Error('conductEngine: questionSet has no rolePlay questions');

  return {
    policy,
    phase: { kind: 'rolePlay', taskIndex: 0 },
    rolePlayTasks: rpQuestions.map((q) => ({
      questionId: q.questionId,
      partsExpected: q.partsExpected ?? 1,
      partsAddressed: 0,
      repeatUsed: false,
    })),
    topic1Questions: topicQuestions(questionSet, 'topic1').map(initialTopicQuestionState),
    topic2Questions: topicQuestions(questionSet, 'topic2').map(initialTopicQuestionState),
    furtherAskedCount: { topic1: 0, topic2: 0 },
    extensionAskedCount: { topic1: 0, topic2: 0 },
    lastExtensionIndex: null,
    partStartS: { topic1: null, topic2: null },
    transitionCount: 0,
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
 * Advances the engine one step given a candidate-turn outcome and the session
 * clock at the end of that turn. This is the only entry point the runtime driver
 * calls after the candidate's turn ends. Clock-only ticks are a no-op: every
 * time rule is evaluated when a turn ends, never mid-answer.
 */
export function step(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  input: StepInput,
): StepResult {
  if (input.kind === 'clockTick') {
    return { state, actions: [] };
  }

  const clocked: ConductEngineState = { ...state, clockS: input.clockS };
  const result = input.result;
  const relevant = result.relevant;
  const conductHint = input.conductHint;

  if (clocked.phase.kind === 'rolePlay') {
    return stepRolePlay(questionSet, clocked, result, relevant, conductHint);
  }
  if (clocked.phase.kind === 'topic') {
    return stepTopic(questionSet, clocked, clocked.phase.part, clocked.phase.questionIndex, result, relevant, conductHint);
  }
  if (clocked.phase.kind === 'further') {
    return stepFurther(questionSet, clocked, clocked.phase, result, relevant, conductHint);
  }
  return { state: clocked, actions: [] };
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

/** Why a prompt is being repeated — debug/replay data only (buildSessionTranscript ignores triggers). */
function repeatTrigger(result: CandidateTurnResult, clarificationTrigger: boolean): ExaminerTrigger {
  if (clarificationTrigger) return 'clarification_requested';
  if (result.requestedRepeat) return 'repeat_requested';
  return result.didRespond ? 'irrelevant_answer' : 'no_response';
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
  // and never explain — exam-conduct §8), then advance. An explicit skip bypasses
  // this gate — the candidate already declined to keep trying.
  if (!taskState.repeatUsed && !result.skipConfirmed) {
    const updatedTask: RolePlayTaskState = { ...taskState, repeatUsed: true };
    const nextState = replaceRolePlayTask(state, phase.taskIndex, updatedTask);
    // A pending second part (part 1 already addressed on a partsExpected:2 task) is
    // repeated with secondPartText, never a re-read of part 1's mainText.
    const secondPartPending = task.partsExpected === 2 && taskState.partsAddressed === 1;
    const repeatText = secondPartPending ? (task.secondPartText ?? task.mainText) : task.mainText;
    const action = makeAction(
      nextState,
      'REPEAT',
      'rolePlay',
      task.questionId,
      'main',
      repeatText,
      repeatTrigger(result, clarificationTrigger),
    );
    return { state: bumpSeq(nextState), actions: [action] };
  }

  // Failed repeat: advance regardless of partsAddressed (exam-conduct §8: move on after one repeat).
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
    return startTopic(questionSet, state, 'topic1');
  }

  const nextTask = rpQuestions[nextIndex];
  const nextState: ConductEngineState = { ...state, phase: { kind: 'rolePlay', taskIndex: nextIndex } };
  const action = makeAction(nextState, 'READ_MAIN', 'rolePlay', nextTask.questionId, 'main', nextTask.mainText, 'scripted');
  return { state: bumpSeq(nextState), actions: [action] };
}

// ── Topic conversations (Q1-Q5, alternatives, extension, further questions) ──

function topicQuestionStates(state: ConductEngineState, part: TopicPart): TopicQuestionState[] {
  return part === 'topic1' ? state.topic1Questions : state.topic2Questions;
}

function replaceTopicQuestionState(
  state: ConductEngineState,
  part: TopicPart,
  index: number,
  updated: TopicQuestionState,
): ConductEngineState {
  const list = topicQuestionStates(state, part).slice();
  list[index] = updated;
  return part === 'topic1' ? { ...state, topic1Questions: list } : { ...state, topic2Questions: list };
}

/** How long this topic conversation has lasted, by the session clock (exam-conduct §16). */
function conversationElapsedS(state: ConductEngineState, part: TopicPart): number {
  const startS = state.partStartS[part];
  return startS === null ? 0 : state.clockS - startS;
}

/**
 * Starts a topic conversation: records its start on the session clock (the
 * handling of the previous part's last answer — exam-conduct §16, D8) and reads Q1.
 */
function startTopic(questionSet: SessionQuestionSet, state: ConductEngineState, part: TopicPart): StepResult {
  const nextState: ConductEngineState = {
    ...state,
    phase: { kind: 'topic', part, questionIndex: 0 },
    partStartS: { ...state.partStartS, [part]: state.clockS },
  };
  const q = topicQuestions(questionSet, part)[0];
  const action = makeAction(nextState, 'READ_MAIN', part, q.questionId, 'main', q.mainText, 'scripted');
  return { state: bumpSeq(nextState), actions: [action] };
}

function stepTopic(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
  questionIndex: number,
  rawResult: CandidateTurnResult,
  rawRelevant: boolean,
  hint?: ConductHint,
): StepResult {
  const { result, relevant, clarificationTrigger } = applyConductHint(
    { ...rawResult, relevant: rawRelevant },
    hint,
  );
  const question = topicQuestions(questionSet, part)[questionIndex];
  const qState = topicQuestionStates(state, part)[questionIndex];
  const didAnswer = result.didRespond && relevant;

  // Every answered part of the question adds to the whole answer the extension
  // decision is made on (exam-conduct §14).
  const answeredState: ConductEngineState = didAnswer
    ? replaceTopicQuestionState(state, part, questionIndex, {
        ...qState,
        answerWords: qState.answerWords + result.wordCount,
        answerSpeechS: qState.answerSpeechS + result.responseDurationS,
      })
    : state;

  const repeatAction = (updated: TopicQuestionState, variant: ExaminerAction['variant'], text: string, trigger: ExaminerTrigger): StepResult => {
    const nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
    const action = makeAction(nextState, 'REPEAT', part, question.questionId, variant, text, trigger);
    return { state: bumpSeq(nextState), actions: [action] };
  };
  const mayRepeat = (used: boolean) => !used && !result.skipConfirmed;

  switch (qState.subState) {
    case 'awaitingAnswer':
    case 'repeated': {
      if (didAnswer) return moveToSecondPartOrExtension(questionSet, answeredState, part, questionIndex, question);
      if (qState.subState === 'awaitingAnswer' && mayRepeat(qState.repeatUsed)) {
        return repeatAction(
          { ...qState, subState: 'repeated', repeatUsed: true },
          'main',
          question.mainText,
          repeatTrigger(result, clarificationTrigger),
        );
      }
      return afterFailedMain(questionSet, state, part, questionIndex, question);
    }

    case 'secondPart': {
      // Second part answered (or its one repeat exhausted): the alternative is NEVER
      // offered for a second part.
      if (didAnswer) return moveToExtensionOrAdvance(questionSet, answeredState, part, questionIndex);
      if (mayRepeat(qState.secondPartRepeatUsed)) {
        return repeatAction(
          { ...qState, secondPartRepeatUsed: true },
          'main',
          question.secondPartText ?? question.mainText,
          repeatTrigger(result, clarificationTrigger),
        );
      }
      // Failed second part: next question, no acknowledgement (exam-conduct §18).
      return advanceTopicQuestion(questionSet, state, part, questionIndex);
    }

    case 'alternative': {
      const partIndex = qState.alternativePartIndex;
      if (didAnswer) {
        const nextPart = partIndex + 1;
        if (nextPart < question.alternativeTexts.length) {
          // D9: the alternative's next part, after a pause for this part's answer.
          const updated: TopicQuestionState = {
            ...topicQuestionStates(answeredState, part)[questionIndex],
            alternativePartIndex: nextPart,
            alternativeRepeatUsed: false,
          };
          const nextState = replaceTopicQuestionState(answeredState, part, questionIndex, updated);
          const action = makeAction(
            nextState,
            'READ_ALTERNATIVE',
            part,
            question.questionId,
            'alternative',
            question.alternativeTexts[nextPart],
            'scripted',
          );
          return { state: bumpSeq(nextState), actions: [action] };
        }
        return moveToExtensionOrAdvance(questionSet, answeredState, part, questionIndex);
      }
      if (mayRepeat(qState.alternativeRepeatUsed)) {
        return repeatAction(
          { ...qState, alternativeRepeatUsed: true },
          'alternative',
          question.alternativeTexts[partIndex],
          clarificationTrigger ? 'clarification_requested' : result.requestedRepeat ? 'repeat_requested' : 'failed_repeat',
        );
      }
      return advanceTopicQuestion(questionSet, state, part, questionIndex);
    }

    case 'extending': {
      if (didAnswer) return advanceWithTransition(questionSet, answeredState, part, questionIndex);
      if (mayRepeat(qState.extensionRepeatUsed)) {
        return repeatAction(
          { ...qState, extensionRepeatUsed: true },
          null,
          AUTHORIZED_EXTENSION_PROMPTS[state.lastExtensionIndex ?? 0],
          repeatTrigger(result, clarificationTrigger),
        );
      }
      // Unanswered extension prompt: move on, no acknowledgement (exam-conduct §18).
      return advanceTopicQuestion(questionSet, state, part, questionIndex);
    }

    case 'done':
      // Unreachable: a 'done' question has already advanced the phase past itself.
      return advanceTopicQuestion(questionSet, state, part, questionIndex);
  }
}

/**
 * After the main question fails its one repeat: offer the alternative iff the
 * question is Q3-Q5 (exam-conduct §12-§13) and has one, else advance.
 */
function afterFailedMain(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
  questionIndex: number,
  question: SessionQuestion,
): StepResult {
  if (questionIndex >= FIRST_ALTERNATIVE_QUESTION_INDEX && question.alternativeTexts.length > 0) {
    const qState = topicQuestionStates(state, part)[questionIndex];
    const updated: TopicQuestionState = { ...qState, subState: 'alternative', alternativePartIndex: 0 };
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
 * second-part prompt and enter the 'secondPart' sub-state (exam-conduct §7 — always
 * asked, even if part 1 already answered it). Otherwise fall through to the
 * extension/advance funnel. An alternative's own parts are walked in stepTopic's
 * 'alternative' branch instead.
 */
function moveToSecondPartOrExtension(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
  questionIndex: number,
  question: SessionQuestion,
): StepResult {
  const qState = topicQuestionStates(state, part)[questionIndex];

  if (question.secondPartText) {
    const updated: TopicQuestionState = { ...qState, subState: 'secondPart' };
    const nextState = replaceTopicQuestionState(state, part, questionIndex, updated);
    // Same questionId, second emission — event kind stays main_question.
    const action = makeAction(nextState, 'READ_MAIN', part, question.questionId, 'main', question.secondPartText, 'scripted');
    return { state: bumpSeq(nextState), actions: [action] };
  }

  return moveToExtensionOrAdvance(questionSet, state, part, questionIndex);
}

/**
 * After a question is fully answered: ask an extension prompt if the WHOLE answer
 * was brief (exam-conduct §14), unless the per-topic cap is reached or — Exam Sim
 * only — the conversation has already lasted TOPIC_TARGET_S (exam-conduct §17).
 * Otherwise acknowledge and advance.
 */
function moveToExtensionOrAdvance(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
  questionIndex: number,
): StepResult {
  const qState = topicQuestionStates(state, part)[questionIndex];
  const question = topicQuestions(questionSet, part)[questionIndex];
  const askedSoFar = state.extensionAskedCount[part];
  const pastTarget = state.policy.mode === 'examSim' && conversationElapsedS(state, part) >= TOPIC_TARGET_S;
  const decision =
    askedSoFar < MAX_EXTENSIONS_PER_TOPIC && !pastTarget
      ? decideExtension({ wordCount: qState.answerWords, responseDurationS: qState.answerSpeechS }, state.lastExtensionIndex)
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

  const nextState = replaceTopicQuestionState(state, part, questionIndex, { ...qState, subState: 'done' });
  return advanceWithTransition(questionSet, nextState, part, questionIndex);
}

/**
 * Acknowledges an ANSWERED prompt (exam-conduct §18) with a neutral TRANSITION,
 * then advances. Called only after a successful answer — a main/second-part/
 * alternative answer via moveToExtensionOrAdvance, an extension-prompt answer,
 * or a further-question answer. Failure paths (failed repeat, alternative,
 * extension or further question) call the advance directly, so they are never
 * acknowledged. Suppressed when the advance emits END (the closing "Merci." on the
 * END action itself is enough).
 */
function advanceWithTransition(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
  questionIndex: number | null,
): StepResult {
  const text = decideTransition(state.transitionCount);
  const nextState: ConductEngineState = { ...state, transitionCount: state.transitionCount + 1 };
  const transitionAction = makeAction(nextState, 'TRANSITION', part, null, null, text, 'scripted');

  const advanced =
    questionIndex === null
      ? checkFloorOrAdvancePart(questionSet, bumpSeq(nextState), part)
      : advanceTopicQuestion(questionSet, bumpSeq(nextState), part, questionIndex);

  if (advanced.actions.length === 1 && advanced.actions[0].kind === 'END') {
    // Final handoff: a closing "Merci." rides on the END action itself — don't double it.
    return { state: advanced.state, actions: advanced.actions };
  }

  return { state: advanced.state, actions: [transitionAction, ...advanced.actions] };
}

function advanceTopicQuestion(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
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

  // All scripted Q1-Q5 (+ alternatives) asked: 3½-min check.
  return checkFloorOrAdvancePart(questionSet, state, part);
}

/**
 * Exam Sim: if the conversation has lasted 3½ min or less (wall clock), ask the
 * next authored further question, up to 2 (exam-conduct §15-§16). Re-checked after
 * each one. Coached Practice asks none (exam-conduct §24, D5).
 */
function checkFloorOrAdvancePart(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
): StepResult {
  const askedSoFar = state.furtherAskedCount[part];
  const promptText = questionSet.furtherQuestions[part][askedSoFar];

  if (
    state.policy.mode === 'examSim' &&
    askedSoFar < MAX_FURTHER_QUESTIONS_PER_TOPIC &&
    promptText !== undefined &&
    conversationElapsedS(state, part) <= TOPIC_FURTHER_QUESTION_FLOOR_S
  ) {
    const nextState: ConductEngineState = {
      ...state,
      phase: { kind: 'further', part, furtherIndex: askedSoFar, repeatUsed: false },
      furtherAskedCount: { ...state.furtherAskedCount, [part]: askedSoFar + 1 },
    };
    const action = makeAction(nextState, 'FURTHER_QUESTION', part, null, null, promptText, 'below_min_duration');
    return { state: bumpSeq(nextState), actions: [action] };
  }

  return advancePart(questionSet, state, part);
}

/**
 * A further question's own step (exam-conduct §11, §15): answered → acknowledge
 * and re-check the 3½-min floor; unanswered → one verbatim repeat, then move on
 * without an acknowledgement. Never touches Q5's state.
 */
function stepFurther(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  phase: Extract<ConductPhase, { kind: 'further' }>,
  rawResult: CandidateTurnResult,
  rawRelevant: boolean,
  hint?: ConductHint,
): StepResult {
  const { result, relevant, clarificationTrigger } = applyConductHint(
    { ...rawResult, relevant: rawRelevant },
    hint,
  );

  if (result.didRespond && relevant) {
    return advanceWithTransition(questionSet, state, phase.part, null);
  }

  if (!phase.repeatUsed && !result.skipConfirmed) {
    const nextState: ConductEngineState = { ...state, phase: { ...phase, repeatUsed: true } };
    const text = questionSet.furtherQuestions[phase.part][phase.furtherIndex];
    const action = makeAction(nextState, 'REPEAT', phase.part, null, null, text, repeatTrigger(result, clarificationTrigger));
    return { state: bumpSeq(nextState), actions: [action] };
  }

  return checkFloorOrAdvancePart(questionSet, state, phase.part);
}

function advancePart(
  questionSet: SessionQuestionSet,
  state: ConductEngineState,
  part: TopicPart,
): StepResult {
  if (part === 'topic1') {
    return startTopic(questionSet, state, 'topic2');
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
    inputMode: result.inputMode,
  };
}

export function findQuestionById(questionSet: SessionQuestionSet, questionId: string): SessionQuestion {
  return findQuestion(questionSet, questionId);
}
