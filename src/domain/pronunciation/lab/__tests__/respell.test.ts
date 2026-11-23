import { describe, expect, it } from 'vitest';
import { respellWord } from '../respell';
import { vocabCue, vocabSpoken } from '../vocabSpeech';

describe('respellWord', () => {
  it.each([
    ['bon', 'boh(n)'],
    ['tu', 'tew'],
    ['tout', 'too'],
    ['vin', 'veh(n)'],
    ['rouge', 'roozh'],
    ['deux', 'duh'],
    ['jardin', 'zhahr-deh(n)'],
    ['beaucoup', 'boh-koo'],
    ['été', 'ay-tay'],
    ['maison', 'meh-zoh(n)'],
    ['petit', 'puh-tee'],
  ])('« %s » sounds roughly like %s', (word, cue) => {
    expect(respellWord(word)).toBe(cue);
  });

  it('shows a nasal vowel with the n in brackets, so the n is not said', () => {
    expect(respellWord('dans')).toBe('dah(n)');
  });

  it('gives nothing for an ambiguous spelling, a loanword, digits or an empty string', () => {
    expect(respellWord('souvent')).toBeNull();
    expect(respellWord('parlent')).toBeNull();
    expect(respellWord('football')).toBeNull();
    expect(respellWord('3')).toBeNull();
    expect(respellWord('')).toBeNull();
  });

  it('never returns a cue that only repeats the spelling', () => {
    for (const word of ['bon', 'tu', 'la', 'ma', 'sa', 'va', 'un', 'et', 'est']) {
      const cue = respellWord(word);
      if (cue) expect(cue.replace(/[-()]/g, '')).not.toBe(word);
    }
  });
});

describe('vocabSpoken / vocabCue', () => {
  it('drops bracketed endings, takes the first alternative and writes words as the lexicon does', () => {
    expect(vocabSpoken('fascinant(e)')).toBe('fascinant');
    expect(vocabSpoken('cadet/cadette')).toBe('cadet');
    expect(vocabSpoken('Faire du sport')).toBe('faire du sport');
    expect(vocabSpoken('je trouve que...')).toBe('je trouve que');
    expect(vocabSpoken('…')).toBeNull();
  });

  it('gives a cue for a single word only', () => {
    expect(vocabCue('bon')).toBe('boh(n)');
    expect(vocabCue('faire du sport')).toBeNull();
    expect(vocabCue('')).toBeNull();
  });
});
