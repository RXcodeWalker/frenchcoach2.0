import { describe, expect, it } from 'vitest';
import { BENCHMARK_SENTENCES } from '../../../domain/pronunciation/lab/benchmark';
import { buildLabTake } from '../../../domain/pronunciation/lab/wordStates';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';
import {
  MAX_ATTEMPTS,
  canTry,
  checkTotals,
  initialMonthlyCheckState,
  monthlyCheckReducer as reduce,
  type CheckAction,
  type MonthlyCheckState,
} from '../monthlyCheckState';

const usable = (index: number) => {
  const sentence = BENCHMARK_SENTENCES[index];
  return buildLabTake(sentence, scripted(sentence.split(/\s+/).map((w, i) => azureWord(w.replace(/[.,]/g, ''), i % 2 === 0 ? 90 : 50))));
};
const refused = () => buildLabTake(BENCHMARK_SENTENCES[0], scripted([azureWord('mes', 90)], { mode: 'freeform' }));

const run = (state: MonthlyCheckState, ...actions: CheckAction[]) => actions.reduce(reduce, state);
const attempt = (state: MonthlyCheckState, outcome: CheckAction): MonthlyCheckState => run(state, { type: 'recordStarted' }, { type: 'checking' }, outcome);

describe('monthlyCheckReducer', () => {
  it('starts on the intro and begins at the first sentence', () => {
    expect(initialMonthlyCheckState.phase).toBe('intro');
    const s = reduce(initialMonthlyCheckState, { type: 'begin' });
    expect(s).toMatchObject({ phase: 'sentence', index: 0 });
    expect(canTry(s)).toBe(true);
  });

  it('counts the first usable take and shows its result', () => {
    const take = usable(0);
    const s = attempt(reduce(initialMonthlyCheckState, { type: 'begin' }), { type: 'checked', take });
    expect(s.phase).toBe('result');
    expect(s.take).toBe(take);
    expect(s.results[0]).toEqual({ index: 0, wordsClear: take.counts.clear, wordsTotal: take.counts.total });
    // No second take on a counted sentence.
    expect(reduce(s, { type: 'recordStarted' })).toBe(s);
  });

  it('moves through all five sentences to the summary', () => {
    let s = reduce(initialMonthlyCheckState, { type: 'begin' });
    for (let i = 0; i < BENCHMARK_SENTENCES.length; i++) {
      expect(s.index).toBe(i);
      s = run(attempt(s, { type: 'checked', take: usable(i) }), { type: 'next' });
    }
    expect(s.phase).toBe('summary');
    expect(checkTotals(s.results).measured).toBe(5);
  });

  it('an uncounted try may be repeated, then the sentence is left unmeasured — never zero', () => {
    let s = reduce(initialMonthlyCheckState, { type: 'begin' });
    s = attempt(s, { type: 'checked', take: refused() });
    expect(s).toMatchObject({ phase: 'sentence', index: 0, attempts: 1, notice: 'no-word-check' });
    s = attempt(s, { type: 'checkFailed', reason: 'too-short' });
    expect(s.notice).toBe('too-short');
    s = attempt(s, { type: 'checkFailed', reason: 'failed' });
    expect(MAX_ATTEMPTS).toBe(3);
    expect(s).toMatchObject({ phase: 'sentence', index: 1, attempts: 0, notice: 'left-out' });
    expect(s.results[0]).toBeNull();
  });

  it('skip is always available between takes, and a skipped sentence is unmeasured', () => {
    let s = reduce(initialMonthlyCheckState, { type: 'begin' });
    s = reduce(s, { type: 'skip' });
    expect(s).toMatchObject({ index: 1, phase: 'sentence' });
    expect(s.results[0]).toBeNull();
    // Not while a take is in flight.
    const busy = run(s, { type: 'recordStarted' });
    expect(reduce(busy, { type: 'skip' })).toBe(busy);
  });

  it('skipping the last sentence ends the check', () => {
    let s = reduce(initialMonthlyCheckState, { type: 'begin' });
    for (let i = 0; i < BENCHMARK_SENTENCES.length; i++) s = reduce(s, { type: 'skip' });
    expect(s.phase).toBe('summary');
    expect(checkTotals(s.results)).toEqual({ clear: 0, total: 0, measured: 0 });
  });

  it('a missing microphone is a notice, not a dead end', () => {
    const s = run(reduce(initialMonthlyCheckState, { type: 'begin' }), { type: 'recordStarted' }, { type: 'micUnavailable' });
    expect(s.notice).toBe('mic-unavailable');
    expect(s.activity.kind).toBe('idle');
    expect(canTry(s)).toBe(true);
  });

  it('consent and sign-in end the check with the reason', () => {
    for (const reason of ['consent', 'sign-in'] as const) {
      const s = attempt(reduce(initialMonthlyCheckState, { type: 'begin' }), { type: 'checkFailed', reason });
      expect(s.stopped).toBe(reason);
      expect(reduce(s, { type: 'skip' })).toBe(s);
    }
  });

  it('a used-up daily allowance ends the check at the summary and keeps what was measured', () => {
    let s = reduce(initialMonthlyCheckState, { type: 'begin' });
    s = run(s, { type: 'recordStarted' }, { type: 'checking' }, { type: 'checked', take: usable(0) }, { type: 'next' });
    s = attempt(s, { type: 'checkFailed', reason: 'allowance' });
    expect(s).toMatchObject({ phase: 'summary', notice: 'allowance-used', stopped: null });
    expect(s.activity.kind).toBe('idle');
    expect(checkTotals(s.results).measured).toBe(1);
  });

  it('ignores a result when nothing was being checked', () => {
    const s = reduce(initialMonthlyCheckState, { type: 'begin' });
    expect(reduce(s, { type: 'checked', take: usable(0) })).toBe(s);
  });
});
