import { describe, expect, it } from 'vitest';
import { describeMark, describeMarks, headlineFor, slipSummary, soundHint } from '../feedbackText';
import { judgeText } from '../judge';

describe('describeMark', () => {
  it('says nothing about a right word', () => {
    expect(describeMark({ kind: 'ok', target: 'chat', typed: 'chat' })).toBe('');
  });

  it('names each kind of slip in a plain sentence', () => {
    const marks = judgeText("J'ai un frère et une sœur", 'Jai un frere est une soeur').marks;
    const notes = marks.map(describeMark);
    expect(notes).toContain("Check the apostrophe, hyphen or space: it is “J'ai”.");
    expect(notes).toContain('Check the accent: it is “frère”.');
    expect(notes.find(n => n.includes('“est” sounds the same as “et”'))).toMatch(/et = and\. est = is/);
  });

  it('tells a liaison slip from a plain wrong word', () => {
    const v = judgeText('Ses parents ont acheté ces livres', 'Ses parents on acheté ces livres');
    expect(v.marks.map(describeMark).join(' ')).toMatch(/Listen for the linking sound: it is “ont”, not “on”/);
  });
});

describe('describeMarks', () => {
  it('folds a run of missing words into one sentence', () => {
    const v = judgeText('Je mets toujours un pull', 'Je');
    expect(describeMarks(v.marks)).toEqual(['Missing: “mets toujours un pull”.']);
  });

  it('folds a run of extra words too, and keeps single ones as they are', () => {
    expect(describeMarks(judgeText('un chat', 'un petit gros chat').marks)).toEqual(['“petit gros” was not said.']);
    expect(describeMarks(judgeText('un chat noir', 'un chat').marks)).toEqual(['Missing: “noir”.']);
  });
});

describe('headlineFor', () => {
  it('is Perfect only for a perfect answer', () => {
    expect(headlineFor(judgeText('la maison', 'la maison'), false)).toEqual({ tone: 'perfect', text: 'Perfect' });
  });

  it('is close for accent-only slips, and says so', () => {
    expect(headlineFor(judgeText('le frère', 'le frere'), false)).toEqual({ tone: 'close', text: 'So close: just the accents' });
    expect(headlineFor(judgeText("J'ai un frère", 'Jai un frère'), false).text).toBe('So close: check the accents and apostrophes');
  });

  it('is a miss for a wrong answer, and a skip just shows the line', () => {
    expect(headlineFor(judgeText('le chat', 'zzz'), false)).toEqual({ tone: 'miss', text: 'Not quite' });
    expect(headlineFor(judgeText('le chat', ''), true)).toEqual({ tone: 'miss', text: 'Here is what was said' });
  });
});

describe('slipSummary', () => {
  it('counts sound-alikes, accents and other words', () => {
    expect(slipSummary(judgeText('Il va à Paris', 'Il va a Paris'))).toBe('a sound-alike');
    expect(slipSummary(judgeText('le frère noir', 'le frere gris'))).toBe('an accent or apostrophe, a word');
    expect(slipSummary(judgeText('le chat', 'le chat'))).toBe('');
  });
});

describe('soundHint', () => {
  it('falls back to the exam table\'s own description for a class without a rule of thumb', () => {
    expect(soundHint('il-ils')).toMatch(/il \/ ils/);
    expect(soundHint('nope')).toBe('');
    expect(soundHint(undefined)).toBe('');
  });
});
