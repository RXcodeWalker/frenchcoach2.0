/**
 * The Lab practice flow's state (pronunciation-lab plan §3.2) as a pure
 * reducer, so the step rules and the never-trap rules are testable without a
 * microphone. `LabPractice.tsx` owns the I/O (recorder, upload, playback) and
 * feeds the results in here.
 *
 *   Listen → Say it → Compare → Focus (≤ 2 words) → Say it again → Compare …
 *
 * Never a trap: every failure (no microphone, nothing recorded, the check
 * failed or was too short to check, a result that can't give word states)
 * leaves the learner on a screen with Done; only the consent and sign-in
 * refusals end the flow, and they do it with the reason on screen and a
 * Continue button.
 *
 * Takes are kept oldest first and only for this sitting — the reducer holds
 * no audio (the component keeps each take's blob in memory) and nothing here
 * is stored, synced or sent anywhere.
 */

import { chooseFocusWords, type FocusWord } from '../../domain/pronunciation/lab/focusWords';
import { compareTakes, type TakeComparison } from '../../domain/pronunciation/lab/takeCompare';
import type { DrillVerdict, LabTake } from '../../domain/pronunciation/lab/wordStates';

/** Product decision, not a measurement: whole-sentence takes per sitting (each one spends Azure seconds). */
export const MAX_SENTENCE_TAKES = 4;
/** Product decision, not a measurement: takes of one focus word. */
export const MAX_WORD_TAKES = 3;

export type LabStep = 'listen' | 'say' | 'compare' | 'focus';

/** What is being recorded or checked: the whole sentence, or focus word number `index`. */
export type LabTarget = { kind: 'sentence' } | { kind: 'word'; index: number };

export type LabActivity =
  | { kind: 'idle' }
  | { kind: 'recording'; target: LabTarget }
  | { kind: 'checking'; target: LabTarget };

/** A message under the controls; the learner can always carry on. */
export type LabNotice =
  /** The microphone could not start, or nothing was captured. */
  | 'mic-unavailable'
  /** The check failed (network, timeout, server). */
  | 'check-failed'
  /** The recording was too short to check. */
  | 'too-short'
  /** The result can't give word states (not Azure, or Azure couldn't assess it). */
  | 'no-word-check';

/** Ends the flow with the reason on screen and a Continue button. */
export type LabStop = 'consent' | 'sign-in';

export type CheckFailure = 'failed' | 'too-short' | 'consent' | 'sign-in';

export interface LabPracticeState {
  step: LabStep;
  activity: LabActivity;
  /** Whole-sentence takes this sitting, oldest first (refused ones included). */
  takes: LabTake[];
  /** Focus words chosen from the latest take. */
  focus: FocusWord[];
  focusEmphasis: 'none' | 'offer' | 'suggest';
  focusIndex: number;
  /** Drill verdicts per focus word (same order as `focus`), oldest first. */
  drills: DrillVerdict[][];
  notice: LabNotice | null;
  stopped: LabStop | null;
}

export type LabAction =
  | { type: 'recordStarted'; target: LabTarget }
  | { type: 'micUnavailable' }
  | { type: 'checking' }
  | { type: 'sentenceChecked'; take: LabTake }
  | { type: 'wordChecked'; verdict: DrillVerdict }
  | { type: 'checkFailed'; reason: CheckFailure }
  | { type: 'startFocus' }
  | { type: 'nextFocus' }
  | { type: 'sayAgain' }
  | { type: 'dismissNotice' };

export const initialLabPracticeState: LabPracticeState = {
  step: 'listen',
  activity: { kind: 'idle' },
  takes: [],
  focus: [],
  focusEmphasis: 'none',
  focusIndex: 0,
  drills: [],
  notice: null,
  stopped: null,
};

export function canRecordSentence(state: LabPracticeState): boolean {
  return state.takes.length < MAX_SENTENCE_TAKES;
}

export function canRecordWord(state: LabPracticeState, index: number): boolean {
  return index >= 0 && index < state.focus.length && (state.drills[index]?.length ?? 0) < MAX_WORD_TAKES;
}

/** The take Compare shows: the latest one. */
export function latestTake(state: LabPracticeState): LabTake | null {
  return state.takes[state.takes.length - 1] ?? null;
}

/** First vs best for this sentence, once there are two usable takes. */
export function firstVsBest(state: LabPracticeState): TakeComparison | null {
  const usable = state.takes.filter((t) => t.refused === null);
  if (usable.length < 2) return null;
  return compareTakes(state.takes);
}

/** True while the flow is waiting on the microphone or the check. */
export function isBusy(state: LabPracticeState): boolean {
  return state.activity.kind !== 'idle';
}

export function labPracticeReducer(state: LabPracticeState, action: LabAction): LabPracticeState {
  if (state.stopped) return state;
  switch (action.type) {
    case 'recordStarted': {
      if (isBusy(state)) return state;
      const target = action.target;
      if (target.kind === 'sentence' && !canRecordSentence(state)) return state;
      if (target.kind === 'word' && !canRecordWord(state, target.index)) return state;
      return {
        ...state,
        step: target.kind === 'sentence' ? 'say' : 'focus',
        activity: { kind: 'recording', target },
        notice: null,
      };
    }
    case 'micUnavailable':
      return { ...state, activity: { kind: 'idle' }, notice: 'mic-unavailable' };
    case 'checking':
      if (state.activity.kind !== 'recording') return state;
      return { ...state, activity: { kind: 'checking', target: state.activity.target } };
    case 'sentenceChecked': {
      const take = action.take;
      const choice = chooseFocusWords(take);
      return {
        ...state,
        step: 'compare',
        activity: { kind: 'idle' },
        takes: [...state.takes, take],
        focus: choice.words,
        focusEmphasis: choice.emphasis,
        focusIndex: 0,
        drills: choice.words.map(() => []),
        notice: take.refused ? 'no-word-check' : null,
      };
    }
    case 'wordChecked': {
      if (state.activity.kind !== 'checking' || state.activity.target.kind !== 'word') return state;
      const index = state.activity.target.index;
      const drills = state.drills.map((d, i) => (i === index ? [...d, action.verdict] : d));
      return {
        ...state,
        activity: { kind: 'idle' },
        drills,
        notice: action.verdict === 'unknown' ? 'no-word-check' : null,
      };
    }
    case 'checkFailed': {
      if (action.reason === 'consent' || action.reason === 'sign-in') {
        return { ...state, activity: { kind: 'idle' }, stopped: action.reason };
      }
      return { ...state, activity: { kind: 'idle' }, notice: action.reason === 'too-short' ? 'too-short' : 'check-failed' };
    }
    case 'startFocus':
      if (isBusy(state) || state.focus.length === 0) return state;
      return { ...state, step: 'focus', focusIndex: 0, notice: null };
    case 'nextFocus':
      if (isBusy(state) || state.step !== 'focus') return state;
      return { ...state, focusIndex: Math.min(state.focusIndex + 1, state.focus.length), notice: null };
    case 'sayAgain':
      if (isBusy(state) || !canRecordSentence(state)) return state;
      return { ...state, step: 'say', notice: null };
    case 'dismissNotice':
      return { ...state, notice: null };
  }
}
