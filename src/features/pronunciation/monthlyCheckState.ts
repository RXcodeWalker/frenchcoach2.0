/**
 * The monthly check's state (pronunciation-lab plan §3.3) as a pure reducer, so
 * its rules are testable without a microphone. `MonthlyCheck.tsx` owns the I/O
 * (recorder, upload, playback) and feeds the results in here.
 *
 *   intro → sentence 1 → result → … → sentence 5 → result → summary
 *
 * One take counts per sentence: the first one that could give word states.
 * A take that couldn't (the check failed, was too short, or gave no word
 * states) is not counted and may be tried again, up to `MAX_ATTEMPTS` per
 * sentence; after that, or when the learner skips, the sentence is simply not
 * measured — never counted as zero (`monthlyCheck.sentenceResult`). Never a
 * trap: Skip is always on screen; only the consent and sign-in refusals end the
 * check, with the reason on screen and a Continue button.
 *
 * Nothing here is stored. The component saves the finished check once, at the
 * summary.
 */

import { BENCHMARK_SENTENCES } from '../../domain/pronunciation/lab/benchmark';
import { sentenceResult, type CheckSentenceResult } from '../../domain/pronunciation/lab/monthlyCheck';
import type { LabTake } from '../../domain/pronunciation/lab/wordStates';
import type { CheckFailure } from './labPracticeState';

/** Product decision, not a measurement: tries per sentence before it is left out (each spends Azure seconds). */
export const MAX_ATTEMPTS = 3;

export type CheckPhase = 'intro' | 'sentence' | 'result' | 'summary';

export type CheckActivity = { kind: 'idle' } | { kind: 'recording' } | { kind: 'checking' };

/** A message under the controls; the learner can always carry on. */
export type CheckNotice =
  | 'mic-unavailable'
  | 'check-failed'
  | 'too-short'
  | 'no-word-check'
  /** The previous sentence ran out of tries and was left out of the check. */
  | 'left-out';

export interface MonthlyCheckState {
  phase: CheckPhase;
  /** Index into BENCHMARK_SENTENCES of the sentence on screen. */
  index: number;
  activity: CheckActivity;
  /** Tries made on the current sentence that were not counted. */
  attempts: number;
  /** The counted take of the current sentence, shown on its result screen. */
  take: LabTake | null;
  /** One entry per sentence: measured, or null (skipped / could not be checked / not reached yet). */
  results: Array<CheckSentenceResult | null>;
  notice: CheckNotice | null;
  stopped: 'consent' | 'sign-in' | null;
}

export type CheckAction =
  | { type: 'begin' }
  | { type: 'recordStarted' }
  | { type: 'micUnavailable' }
  | { type: 'checking' }
  | { type: 'checked'; take: LabTake }
  | { type: 'checkFailed'; reason: CheckFailure }
  | { type: 'skip' }
  | { type: 'next' };

export const SENTENCE_COUNT = BENCHMARK_SENTENCES.length;

export const initialMonthlyCheckState: MonthlyCheckState = {
  phase: 'intro',
  index: 0,
  activity: { kind: 'idle' },
  attempts: 0,
  take: null,
  results: BENCHMARK_SENTENCES.map(() => null),
  notice: null,
  stopped: null,
};

export const isBusy = (state: MonthlyCheckState) => state.activity.kind !== 'idle';

/** Whether another try on this sentence is allowed. */
export function canTry(state: MonthlyCheckState): boolean {
  return state.phase === 'sentence' && state.attempts < MAX_ATTEMPTS && !isBusy(state);
}

/** The words clear and total over every measured sentence. */
export function checkTotals(results: ReadonlyArray<CheckSentenceResult | null>): { clear: number; total: number; measured: number } {
  let clear = 0;
  let total = 0;
  let measured = 0;
  for (const r of results) {
    if (!r) continue;
    clear += r.wordsClear;
    total += r.wordsTotal;
    measured += 1;
  }
  return { clear, total, measured };
}

function moveOn(state: MonthlyCheckState, results: MonthlyCheckState['results']): MonthlyCheckState {
  const last = state.index + 1 >= SENTENCE_COUNT;
  return {
    ...state,
    results,
    phase: last ? 'summary' : 'sentence',
    index: last ? state.index : state.index + 1,
    attempts: 0,
    take: null,
    notice: null,
    activity: { kind: 'idle' },
  };
}

export function monthlyCheckReducer(state: MonthlyCheckState, action: CheckAction): MonthlyCheckState {
  if (state.stopped) return state;
  switch (action.type) {
    case 'begin':
      return state.phase === 'intro' ? { ...state, phase: 'sentence' } : state;
    case 'recordStarted':
      if (!canTry(state)) return state;
      return { ...state, activity: { kind: 'recording' }, notice: null };
    case 'micUnavailable':
      return { ...state, activity: { kind: 'idle' }, notice: 'mic-unavailable' };
    case 'checking':
      return state.activity.kind === 'recording' ? { ...state, activity: { kind: 'checking' } } : state;
    case 'checked': {
      if (state.activity.kind !== 'checking') return state;
      const counted = sentenceResult(state.index, action.take);
      if (counted) {
        const results = state.results.map((r, i) => (i === state.index ? counted : r));
        return { ...state, phase: 'result', activity: { kind: 'idle' }, take: action.take, results, notice: null };
      }
      // Could not give word states: not counted, may be tried again.
      return noCount(state, 'no-word-check');
    }
    case 'checkFailed': {
      if (action.reason === 'consent' || action.reason === 'sign-in') {
        return { ...state, activity: { kind: 'idle' }, stopped: action.reason };
      }
      return noCount(state, action.reason === 'too-short' ? 'too-short' : 'check-failed');
    }
    case 'skip':
      if (state.phase !== 'sentence' || isBusy(state)) return state;
      return moveOn(state, state.results);
    case 'next':
      if (state.phase !== 'result') return state;
      return moveOn(state, state.results);
  }
}

/** An uncounted try: the learner stays on the sentence until the tries run out, then it is left unmeasured. */
function noCount(state: MonthlyCheckState, notice: CheckNotice): MonthlyCheckState {
  const attempts = state.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) return { ...moveOn(state, state.results), notice: 'left-out' };
  return { ...state, activity: { kind: 'idle' }, attempts, notice };
}
