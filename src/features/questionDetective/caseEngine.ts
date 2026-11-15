import type { CaseClosing, CaseStep, DetectiveCase } from '../../data/questionWords/cases';
import { WORD_TO_TYPE, type WordId } from '../../data/questionWords/types';
import { judgeAnswer, type Judgement } from './judge';
import { mulberry32, shuffle } from './rng';

/**
 * One case file (question-detective §5). A case is a chain of steps: each step
 * says what the detective knows and what to find out, the learner picks the
 * tool that finds it (four choices, never all eight), the French question
 * fills in and the witness gives the next clue. After the last clue the
 * detective writes the report: three short answers, two tries each.
 */

export type CasePhase = 'question' | 'closing' | 'done';

/** Wrong tools it takes before the hint appears on its own. */
export const AUTO_HINT_AFTER = 2;

export interface CaseState {
  phase: CasePhase;
  stepIndex: number;
  /** The current step's tool was chosen right; the clue is showing. */
  answered: boolean;
  /** Wrong tools tried at the current step. */
  tried: WordId[];
  /** The learner asked for the hint at the current step. */
  hinted: boolean;
  lastWrong: { wordId: WordId; text: string } | null;
  /** Steps found on the first choice (no wrong tool, no hint). */
  firstTry: number;
  closingIndex: number;
  /** 0 on the first go at a closing question, 1 on the retry. */
  closingTry: 0 | 1;
  closingRight: number;
  lastClosing: Judgement | null;
  /** The last closing answer settled (right, or out of tries) and is waiting for Next. */
  closingSettled: boolean;
  solved: boolean;
}

export function startCase(): CaseState {
  return {
    phase: 'question',
    stepIndex: 0,
    answered: false,
    tried: [],
    hinted: false,
    lastWrong: null,
    firstTry: 0,
    closingIndex: 0,
    closingTry: 0,
    closingRight: 0,
    lastClosing: null,
    closingSettled: false,
    solved: false,
  };
}

export function currentStep(file: DetectiveCase, state: CaseState): CaseStep | null {
  if (state.phase !== 'question') return null;
  return file.steps[state.stepIndex] ?? null;
}

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The right tool and the step's three wrong ones, in a stable order that is not "right one first". */
export function stepChoices(step: CaseStep): WordId[] {
  const wrong = Object.keys(step.wrong) as WordId[];
  return shuffle([step.rightWord, ...wrong], mulberry32(hashOf(step.id)));
}

export function hintVisible(state: CaseState): boolean {
  return state.hinted || state.tried.length >= AUTO_HINT_AFTER;
}

export function askForHint(state: CaseState): CaseState {
  if (state.phase !== 'question' || state.answered) return state;
  return { ...state, hinted: true };
}

/** Ask the witness with one tool. Right shows the clue; wrong shows the confused reply and shuts that tool. */
export function chooseTool(file: DetectiveCase, state: CaseState, wordId: WordId): CaseState {
  if (state.phase !== 'question' || state.answered) return state;
  const step = file.steps[state.stepIndex];
  if (!step || state.tried.includes(wordId)) return state;
  if (wordId === step.rightWord) {
    return {
      ...state,
      answered: true,
      lastWrong: null,
      firstTry: state.firstTry + (state.tried.length === 0 && !state.hinted ? 1 : 0),
    };
  }
  return {
    ...state,
    tried: [...state.tried, wordId],
    lastWrong: { wordId, text: step.wrong[wordId] ?? '…' },
  };
}

/** Move on from a found clue to the next step, or to the report after the last one. */
export function nextStep(file: DetectiveCase, state: CaseState): CaseState {
  if (state.phase !== 'question' || !state.answered) return state;
  const next = state.stepIndex + 1;
  if (next >= file.steps.length) return { ...state, phase: 'closing', answered: false, tried: [], hinted: false, lastWrong: null };
  return { ...state, stepIndex: next, answered: false, tried: [], hinted: false, lastWrong: null };
}

/**
 * The notebook: clues from earlier steps, in order. The clue just found is
 * shown in the conversation and joins the notes when the learner moves on.
 */
export function cluesFound(file: DetectiveCase, state: CaseState): CaseStep[] {
  const count = state.phase === 'question' ? state.stepIndex : file.steps.length;
  return file.steps.slice(0, count);
}

export function currentClosing(file: DetectiveCase, state: CaseState): CaseClosing | null {
  if (state.phase !== 'closing') return null;
  return file.closing[state.closingIndex] ?? null;
}

/** True while the learner is on the second go at a report question, after a first miss. */
export function canRetryClosing(state: CaseState): boolean {
  return state.phase === 'closing' && state.closingTry === 1 && !state.closingSettled && state.lastClosing !== null;
}

/**
 * Judge a report answer. Right or almost settles it. A first miss keeps the
 * question open for one more try (the notes are on screen); a second miss
 * settles it with the answer shown.
 */
export function answerClosing(file: DetectiveCase, state: CaseState, input: string): CaseState {
  if (state.phase !== 'closing' || state.closingSettled) return state;
  const item = file.closing[state.closingIndex];
  if (!item) return state;
  const judgement = judgeAnswer(input, { accepted: item.accepted, model: item.model, wordId: item.wordId });
  const right = judgement.verdict === 'right' || judgement.verdict === 'almost';
  if (right) {
    return { ...state, lastClosing: judgement, closingSettled: true, closingRight: state.closingRight + 1 };
  }
  if (state.closingTry === 0) {
    return { ...state, lastClosing: judgement, closingTry: 1 };
  }
  return { ...state, lastClosing: judgement, closingSettled: true };
}

/** After a settled report answer: the next question, or the end of the case. */
export function nextClosing(file: DetectiveCase, state: CaseState): CaseState {
  if (state.phase !== 'closing' || !state.closingSettled) return state;
  const next = state.closingIndex + 1;
  if (next >= file.closing.length) {
    return { ...state, phase: 'done', solved: state.closingRight === file.closing.length };
  }
  return { ...state, closingIndex: next, closingTry: 0, closingSettled: false, lastClosing: null };
}

export function typeForWord(wordId: WordId) {
  return WORD_TO_TYPE[wordId];
}
