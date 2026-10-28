import { describe, expect, it } from 'vitest';
import { chooseFocusWords } from '../focusWords';
import { buildLabTake } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

describe('chooseFocusWords (plan §3.2 step 4, §5.1)', () => {
  it('picks at most 2, Practise before Almost, lowest first', () => {
    const take = buildLabTake(
      'Mon frère boit du vin rouge.',
      scripted([
        azureWord('mon', 70), azureWord('frère', 50, { errorType: 'mispronounced' }), azureWord('boit', 90),
        azureWord('du', 65), azureWord('vin', 30, { errorType: 'mispronounced' }), azureWord('rouge', 40, { errorType: 'mispronounced' }),
      ]),
    );
    const choice = chooseFocusWords(take);
    expect(choice.words.map((w) => w.text)).toEqual(['vin', 'rouge.']);
    expect(choice.words.every((w) => w.state === 'practise')).toBe(true);
    expect(choice.emphasis).toBe('suggest');
  });

  it('prefers a different sound family over a second word of the same one', () => {
    // vin and pain are both nasal IN (word-level evidence); rouge is R + U/OU.
    const take = buildLabTake(
      'Du vin et du pain rouge.',
      scripted([
        azureWord('du', 95), azureWord('vin', 20, { errorType: 'mispronounced' }), azureWord('et', 95), azureWord('du', 95),
        azureWord('pain', 25, { errorType: 'mispronounced' }), azureWord('rouge', 50, { errorType: 'mispronounced', phonemeScores: [90, 30, 90] }),
      ]),
    );
    const choice = chooseFocusWords(take);
    expect(choice.words.map((w) => [w.text, w.family])).toEqual([['vin', 'nasalIn'], ['rouge.', 'uOu']]);
  });

  it('offers (not insists on) one low word in an otherwise clear take', () => {
    const take = buildLabTake('Je mange du pain.', scripted([azureWord('je', 95), azureWord('mange', 90), azureWord('du', 92), azureWord('pain', 50, { errorType: 'mispronounced' })]));
    expect(chooseFocusWords(take)).toMatchObject({ emphasis: 'offer', words: [{ text: 'pain.' }] });
  });

  it('never picks unknown, Not heard, extra or one-letter words', () => {
    const take = buildLabTake(
      'Il a un chien.',
      scripted([
        azureWord('il', null, { errorType: 'skipped' }), azureWord('a', 20, { errorType: 'mispronounced' }),
        azureWord('euh', 10, { errorType: 'extra' }), azureWord('un', 95), azureWord('chien', null),
      ]),
    );
    expect(chooseFocusWords(take)).toEqual({ words: [], emphasis: 'none' });
  });

  it('gives nothing for a refused take or an all-clear one', () => {
    expect(chooseFocusWords(buildLabTake('rouge', scripted([azureWord('rouge', 20)], { mode: 'freeform' })))).toEqual({ words: [], emphasis: 'none' });
    expect(chooseFocusWords(buildLabTake('rouge', scripted([azureWord('rouge', 95)])))).toEqual({ words: [], emphasis: 'none' });
  });
});
