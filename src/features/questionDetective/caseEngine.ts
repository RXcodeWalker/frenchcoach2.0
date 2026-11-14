import type { DetectiveCase, CaseWitness } from '../../data/questionWords/cases';
import { WORD_TO_TYPE, type WordId } from '../../data/questionWords/types';
import { judgeAnswer, type Judgement } from './judge';

export type CasePhase = 'question' | 'closing' | 'done';

export interface CaseState {
  phase: CasePhase;
  witnessIndex: number;
  clues: string[];
  closingIndex: number;
  closingRight: number;
  lastReply: { kind: 'clue' | 'wrong'; text: string; wordId: WordId } | null;
  lastClosing: Judgement | null;
  solved: boolean;
}

export function startCase(): CaseState {
  return {
    phase: 'question',
    witnessIndex: 0,
    clues: [],
    closingIndex: 0,
    closingRight: 0,
    lastReply: null,
    lastClosing: null,
    solved: false,
  };
}

export function askWitness(file: DetectiveCase, state: CaseState, wordId: WordId): CaseState {
  if (state.phase !== 'question') return state;
  const witness: CaseWitness = file.witnesses[state.witnessIndex];
  if (!witness) return state;
  if (wordId === witness.rightWord) {
    const clues = [...state.clues, witness.clue];
    const nextIndex = state.witnessIndex + 1;
    const doneQuestioning = nextIndex >= file.witnesses.length;
    return {
      ...state,
      clues,
      witnessIndex: doneQuestioning ? state.witnessIndex : nextIndex,
      lastReply: { kind: 'clue', text: witness.clue, wordId },
      phase: doneQuestioning ? 'closing' : 'question',
    };
  }
  const funny = witness.wrong[wordId] ?? '…';
  return { ...state, lastReply: { kind: 'wrong', text: funny, wordId } };
}

export function skipWitness(file: DetectiveCase, state: CaseState): CaseState {
  if (state.phase !== 'question') return state;
  const nextIndex = state.witnessIndex + 1;
  const done = nextIndex >= file.witnesses.length;
  return {
    ...state,
    witnessIndex: done ? state.witnessIndex : nextIndex,
    lastReply: null,
    phase: done ? 'closing' : 'question',
  };
}

export function answerClosing(file: DetectiveCase, state: CaseState, input: string): CaseState {
  if (state.phase !== 'closing') return state;
  const item = file.closing[state.closingIndex];
  if (!item) return { ...state, phase: 'done', solved: state.closingRight === file.closing.length };
  const judgement = judgeAnswer(input, {
    accepted: item.accepted,
    model: item.model,
    wordId: item.wordId,
  });
  const right = judgement.verdict === 'right' || judgement.verdict === 'almost';
  const closingRight = state.closingRight + (right ? 1 : 0);
  const nextIndex = state.closingIndex + 1;
  const done = nextIndex >= file.closing.length;
  return {
    ...state,
    closingIndex: done ? state.closingIndex : nextIndex,
    closingRight,
    lastClosing: judgement,
    phase: done ? 'done' : 'closing',
    solved: done && closingRight === file.closing.length,
  };
}

export function currentWitness(file: DetectiveCase, state: CaseState): CaseWitness | null {
  if (state.phase !== 'question') return null;
  return file.witnesses[state.witnessIndex] ?? null;
}

export function currentClosing(file: DetectiveCase, state: CaseState) {
  if (state.phase !== 'closing') return null;
  return file.closing[state.closingIndex] ?? null;
}

export function typeForWord(wordId: WordId) {
  return WORD_TO_TYPE[wordId];
}
