import { describe, expect, it } from 'vitest';
import { buildLabTake, drillVerdict, labRefusal, takeWords, wordState } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

describe('wordState (plan §5.1)', () => {
  it.each([
    [95, 'correct', 'clear'],
    [80, 'correct', 'clear'],
    [79, 'correct', 'almost'],
    [60, 'correct', 'almost'],
    [59, 'correct', 'practise'],
    [85, 'mispronounced', 'practise'],
  ] as const)('accuracy %d, %s → %s', (accuracy, errorType, expected) => {
    expect(wordState(azureWord('rouge', accuracy, { errorType }))).toBe(expected);
  });

  it('skipped → missed, extra → extra, no accuracy or a seam → unknown', () => {
    expect(wordState(azureWord('rouge', null, { errorType: 'skipped' }))).toBe('missed');
    expect(wordState(azureWord('rouge', 90, { errorType: 'extra' }))).toBe('extra');
    expect(wordState(azureWord('rouge', null))).toBe('unknown');
    expect(wordState(azureWord('rouge', 90, { nearChunkBoundary: true }))).toBe('unknown');
  });

  it('fairness guard: never Practise when every phoneme is at least Almost', () => {
    expect(wordState(azureWord('rouge', 55, { phonemeScores: [62, 60, 70] }))).toBe('almost');
    expect(wordState(azureWord('rouge', 55, { phonemeScores: [62, 40, 70] }))).toBe('practise');
    expect(wordState(azureWord('rouge', 85, { errorType: 'mispronounced', phonemeScores: [90, 88, 86] }))).toBe('almost');
  });
});

describe('buildLabTake', () => {
  const target = 'Je mange du pain, le matin.';

  it('refuses a freeform result: every word unknown, whatever Azure said', () => {
    const take = buildLabTake(target, scripted([azureWord('je', 20), azureWord('mange', 99)], { mode: 'freeform' }));
    expect(take.refused).toBe('freeform');
    expect(takeWords(take).every((w) => w.state === 'unknown')).toBe(true);
    expect(take.counts).toMatchObject({ clear: 0, unknown: 6, total: 6 });
  });

  it('refuses a result with no mode, a non-Azure tier and an unassessable clip', () => {
    expect(labRefusal(scripted([], { mode: undefined }))).toBe('freeform');
    expect(labRefusal(scripted([], { provider: 'whisper-heuristic' }))).toBe('not-azure');
    expect(labRefusal(scripted([], { couldNotAssess: true, score: null }))).toBe('could-not-assess');
    expect(labRefusal(scripted([]))).toBeNull();
  });

  it('places each Azure word on its target word and counts "N of M clear"', () => {
    const take = buildLabTake(
      target,
      scripted([
        azureWord('je', 95), azureWord('mange', 70), azureWord('du', 40, { errorType: 'mispronounced' }),
        azureWord('pain', 90), azureWord('le', null, { errorType: 'skipped' }), azureWord('matin', 88),
      ]),
    );
    expect(takeWords(take).map((w) => [w.text, w.state])).toEqual([
      ['Je', 'clear'], ['mange', 'almost'], ['du', 'practise'], ['pain,', 'clear'], ['le', 'missed'], ['matin.', 'clear'],
    ]);
    expect(take.counts).toEqual({ clear: 3, almost: 1, practise: 1, missed: 1, unknown: 0, extra: 0, total: 6 });
  });

  it('puts extra words between target words, never on one', () => {
    const take = buildLabTake('Je mange.', scripted([azureWord('euh', 90, { errorType: 'extra' }), azureWord('je', 90), azureWord('bien', 80, { errorType: 'extra' }), azureWord('mange', 90)]));
    expect(take.items.map((i) => (i.kind === 'extra' ? `+${i.text}` : i.text))).toEqual(['+euh', 'Je', '+bien', 'mange.']);
    expect(take.counts).toMatchObject({ clear: 2, extra: 2, total: 2 });
  });

  it('joins Azure words that split one target word, and keeps the worse state', () => {
    const take = buildLabTake('Peut-être demain.', scripted([azureWord('peut', 90), azureWord('être', 65), azureWord('demain', 90)]));
    expect(takeWords(take).map((w) => [w.text, w.state])).toEqual([['Peut-être', 'almost'], ['demain.', 'clear']]);
  });

  it('leaves a target word unknown when nothing matches it, without shifting the rest', () => {
    const take = buildLabTake('Il a vingt ans.', scripted([azureWord('il', 90), azureWord('a', 90), azureWord('20', 50), azureWord('ans', 90)]));
    expect(takeWords(take).map((w) => w.state)).toEqual(['clear', 'clear', 'unknown', 'clear']);
  });
});

describe('drillVerdict', () => {
  it('Clear / Almost / Try again from the word said alone', () => {
    expect(drillVerdict(buildLabTake('rouge', scripted([azureWord('rouge', 92)])))).toBe('clear');
    expect(drillVerdict(buildLabTake('rouge', scripted([azureWord('rouge', 70)])))).toBe('almost');
    expect(drillVerdict(buildLabTake('rouge', scripted([azureWord('rouge', 30, { errorType: 'mispronounced' })])))).toBe('tryAgain');
    expect(drillVerdict(buildLabTake('rouge', scripted([azureWord('rouge', null, { errorType: 'skipped' })])))).toBe('tryAgain');
    expect(drillVerdict(buildLabTake('rouge', scripted([azureWord('rouge', 92)], { mode: 'freeform' })))).toBe('unknown');
  });

  it('a liaison group is as good as its worse word', () => {
    expect(drillVerdict(buildLabTake('les enfants', scripted([azureWord('les', 95), azureWord('enfants', 65)])))).toBe('almost');
  });
});
