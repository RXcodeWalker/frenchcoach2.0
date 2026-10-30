import { describe, expect, it } from 'vitest';
import { editDistance, judgeAnswer } from '../judge';

describe('judgeAnswer', () => {
  it('accepts an exact answer', () => {
    expect(judgeAnswer('Je mange du pain', ['Je mange du pain'])).toMatchObject({ verdict: 'correct', accentsMissed: false });
  });

  it('ignores case, spacing and trailing punctuation', () => {
    expect(judgeAnswer('  je  MANGE du pain. ', ['Je mange du pain']).verdict).toBe('correct');
  });

  it('accepts a missing accent but says so', () => {
    const j = judgeAnswer("l'ecole", ["l'école"]);
    expect(j).toMatchObject({ verdict: 'correct', accentsMissed: true, expected: "l'école" });
  });

  it('does not flag accents when they were typed, or when only the apostrophe style differs', () => {
    expect(judgeAnswer("l'école", ["l'école"]).accentsMissed).toBe(false);
    expect(judgeAnswer('l’école', ["l'école"]).accentsMissed).toBe(false);
  });

  it('reads a space as a hyphen', () => {
    expect(judgeAnswer('grand pere', ['grand-père'])).toMatchObject({ verdict: 'correct', accentsMissed: true });
  });

  it('matches any accepted alternative and reports the one that matched', () => {
    expect(judgeAnswer('fascinante', ['fascinant', 'fascinante'])).toMatchObject({ verdict: 'correct', expected: 'fascinante' });
  });

  it('calls one slip "almost", including a swapped pair', () => {
    expect(judgeAnswer('pomem', ['pomme']).verdict).toBe('almost');
    expect(judgeAnswer('pome', ['pomme']).verdict).toBe('almost');
    expect(judgeAnswer('pommes', ['pomme']).verdict).toBe('almost');
  });

  it('never calls a short word a typo', () => {
    expect(judgeAnswer('cha', ['chat']).verdict).toBe('wrong');
    expect(judgeAnswer('il', ['elle']).verdict).toBe('wrong');
  });

  it('keeps the article honest: the wrong gender is wrong, not almost', () => {
    expect(judgeAnswer('le pomme', ['la pomme']).verdict).toBe('wrong');
    expect(judgeAnswer('pomme', ['la pomme']).verdict).toBe('wrong');
    expect(judgeAnswer("ecole", ["l'école"]).verdict).toBe('wrong');
  });

  it('allows two slips only in a long answer', () => {
    expect(judgeAnswer('je mange du pian', ['je mange du pain']).verdict).toBe('almost');
    expect(judgeAnswer('je mange dou pian', ['je mange du pain']).verdict).toBe('almost');
    expect(judgeAnswer('je mange dou piaan', ['je mange du pain']).verdict).toBe('wrong');
  });

  it('shows the nearest accepted spelling when wrong', () => {
    expect(judgeAnswer('la proviseur', ['le proviseur', 'la proviseure'])).toMatchObject({ verdict: 'almost', expected: 'la proviseure' });
    expect(judgeAnswer('chien', ['le chat', 'le chien'])).toMatchObject({ verdict: 'wrong' });
  });

  it('treats an empty answer as wrong without crashing', () => {
    expect(judgeAnswer('   ', ['pain'])).toMatchObject({ verdict: 'wrong', expected: 'pain' });
  });
});

describe('editDistance', () => {
  it('counts insert, delete, substitute and swap as one each', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(editDistance('abc', 'ab')).toBe(1);
    expect(editDistance('abc', 'abd')).toBe(1);
    expect(editDistance('abc', 'acb')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});
