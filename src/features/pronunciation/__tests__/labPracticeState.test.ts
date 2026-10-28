import { describe, expect, it } from 'vitest';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';
import { buildLabTake } from '../../../domain/pronunciation/lab/wordStates';
import {
  MAX_SENTENCE_TAKES,
  MAX_WORD_TAKES,
  canRecordSentence,
  canRecordWord,
  firstVsBest,
  initialLabPracticeState,
  labPracticeReducer,
  type LabAction,
  type LabPracticeState,
} from '../labPracticeState';

const SENTENCE = 'Les enfants jouent dans le jardin.';

function take(scores: Array<number | null>) {
  const words = ['Les', 'enfants', 'jouent', 'dans', 'le', 'jardin'];
  return buildLabTake(SENTENCE, scripted(words.map((w, i) => azureWord(w, scores[i]))));
}

const allClear = () => take([95, 95, 95, 95, 95, 95]);
/** "enfants" Practise, "jardin" Almost. */
const twoLow = () => take([95, 40, 95, 95, 95, 70]);

function run(...actions: LabAction[]): LabPracticeState {
  return actions.reduce(labPracticeReducer, initialLabPracticeState);
}

const sentence = { kind: 'sentence' } as const;

describe('labPracticeReducer', () => {
  it('starts on Listen, idle, with nothing taken', () => {
    expect(initialLabPracticeState.step).toBe('listen');
    expect(initialLabPracticeState.activity.kind).toBe('idle');
    expect(initialLabPracticeState.takes).toEqual([]);
  });

  it('Listen → Say it → checking → Compare, with focus words from the take', () => {
    const recording = run({ type: 'recordStarted', target: sentence });
    expect(recording.step).toBe('say');
    expect(recording.activity).toEqual({ kind: 'recording', target: sentence });
    const checking = labPracticeReducer(recording, { type: 'checking' });
    expect(checking.activity).toEqual({ kind: 'checking', target: sentence });
    const compared = labPracticeReducer(checking, { type: 'sentenceChecked', take: twoLow() });
    expect(compared.step).toBe('compare');
    expect(compared.activity.kind).toBe('idle');
    expect(compared.takes).toHaveLength(1);
    expect(compared.focus.map((w) => w.text)).toEqual(['enfants', 'jardin.']);
    expect(compared.focusEmphasis).toBe('suggest');
    expect(compared.drills).toEqual([[], []]);
    expect(compared.notice).toBeNull();
  });

  it('an all-clear take has no focus words', () => {
    const s = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: allClear() });
    expect(s.focus).toEqual([]);
    expect(s.focusEmphasis).toBe('none');
    expect(labPracticeReducer(s, { type: 'startFocus' })).toBe(s);
  });

  it('a refused take (not Azure) goes to Compare with a notice, never word states', () => {
    const refused = buildLabTake(SENTENCE, scripted([azureWord('Les', 90)], { provider: 'whisper-heuristic' }));
    const s = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: refused });
    expect(s.step).toBe('compare');
    expect(s.notice).toBe('no-word-check');
    expect(s.focus).toEqual([]);
  });

  it('focus drills: one verdict per word take, next word, then the sentence again', () => {
    let s = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: twoLow() });
    s = labPracticeReducer(s, { type: 'startFocus' });
    expect(s.step).toBe('focus');
    expect(s.focusIndex).toBe(0);
    s = [
      { type: 'recordStarted', target: { kind: 'word', index: 0 } },
      { type: 'checking' },
      { type: 'wordChecked', verdict: 'tryAgain' },
      { type: 'recordStarted', target: { kind: 'word', index: 0 } },
      { type: 'checking' },
      { type: 'wordChecked', verdict: 'clear' },
    ].reduce((acc, a) => labPracticeReducer(acc, a as LabAction), s);
    expect(s.drills).toEqual([['tryAgain', 'clear'], []]);
    s = labPracticeReducer(s, { type: 'nextFocus' });
    expect(s.focusIndex).toBe(1);
    s = labPracticeReducer(s, { type: 'nextFocus' });
    expect(s.focusIndex).toBe(2); // past the last word: "say the whole sentence again"
    s = labPracticeReducer(s, { type: 'nextFocus' });
    expect(s.focusIndex).toBe(2);
    s = labPracticeReducer(s, { type: 'sayAgain' });
    expect(s.step).toBe('say');
  });

  it('an unchecked word take says so', () => {
    let s = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: twoLow() }, { type: 'startFocus' });
    s = [{ type: 'recordStarted', target: { kind: 'word', index: 0 } }, { type: 'checking' }, { type: 'wordChecked', verdict: 'unknown' }]
      .reduce((acc, a) => labPracticeReducer(acc, a as LabAction), s);
    expect(s.notice).toBe('no-word-check');
  });

  it('a second take compares first vs best', () => {
    const s = run(
      { type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: twoLow() },
      { type: 'sayAgain' },
      { type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: allClear() },
    );
    expect(s.takes).toHaveLength(2);
    expect(firstVsBest(s)).toMatchObject({ firstClear: 4, bestClear: 6, improvedOverFirst: true });
  });

  it('caps whole-sentence takes and word takes', () => {
    let s = initialLabPracticeState;
    for (let i = 0; i < MAX_SENTENCE_TAKES; i++) {
      s = [{ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'sentenceChecked', take: twoLow() }]
        .reduce((acc, a) => labPracticeReducer(acc, a as LabAction), s);
    }
    expect(canRecordSentence(s)).toBe(false);
    expect(labPracticeReducer(s, { type: 'recordStarted', target: sentence })).toBe(s);
    expect(labPracticeReducer(s, { type: 'sayAgain' })).toBe(s);

    s = labPracticeReducer(s, { type: 'startFocus' });
    for (let i = 0; i < MAX_WORD_TAKES; i++) {
      s = [{ type: 'recordStarted', target: { kind: 'word', index: 0 } }, { type: 'checking' }, { type: 'wordChecked', verdict: 'almost' }]
        .reduce((acc, a) => labPracticeReducer(acc, a as LabAction), s);
    }
    expect(canRecordWord(s, 0)).toBe(false);
    expect(canRecordWord(s, 1)).toBe(true);
    expect(canRecordWord(s, 5)).toBe(false);
  });

  it('never starts a second recording while one is running or being checked', () => {
    const recording = run({ type: 'recordStarted', target: sentence });
    expect(labPracticeReducer(recording, { type: 'recordStarted', target: sentence })).toBe(recording);
    const checking = labPracticeReducer(recording, { type: 'checking' });
    expect(labPracticeReducer(checking, { type: 'recordStarted', target: sentence })).toBe(checking);
  });

  describe('never a trap', () => {
    it('no microphone: back to idle with a notice', () => {
      const s = run({ type: 'micUnavailable' });
      expect(s.activity.kind).toBe('idle');
      expect(s.notice).toBe('mic-unavailable');
      expect(s.stopped).toBeNull();
    });

    it('a failed or too-short check: idle with a notice, recording again allowed', () => {
      const failed = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'checkFailed', reason: 'failed' });
      expect(failed.notice).toBe('check-failed');
      expect(failed.activity.kind).toBe('idle');
      expect(canRecordSentence(failed)).toBe(true);
      const short = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'checkFailed', reason: 'too-short' });
      expect(short.notice).toBe('too-short');
    });

    it('consent and sign-in end the flow with the reason', () => {
      for (const reason of ['consent', 'sign-in'] as const) {
        const s = run({ type: 'recordStarted', target: sentence }, { type: 'checking' }, { type: 'checkFailed', reason });
        expect(s.stopped).toBe(reason);
        expect(s.activity.kind).toBe('idle');
        expect(labPracticeReducer(s, { type: 'recordStarted', target: sentence })).toBe(s);
      }
    });
  });
});
