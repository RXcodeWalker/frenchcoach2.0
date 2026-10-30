import { describe, expect, it } from 'vitest';
import { editDistance, hintFor, isClose, isExact, isStillTyping, lockedTarget, normalizeAnswer } from '../matching';

describe('normalizeAnswer', () => {
  it('ignores case, accents, apostrophes and a leading "to"/"the"/"a"', () => {
    expect(normalizeAnswer('To Eat', 'en')).toBe('eat');
    expect(normalizeAnswer('  The   House ', 'en')).toBe('house');
    expect(normalizeAnswer('École', 'fr')).toBe('ecole');
    expect(normalizeAnswer("l’école", 'fr')).toBe('ecole');
    expect(normalizeAnswer('la bibliothèque', 'fr')).toBe('bibliotheque');
    expect(normalizeAnswer('une pomme', 'fr')).toBe('pomme');
  });

  it('keeps a bare article, which is not an article before a word', () => {
    expect(normalizeAnswer('a', 'en')).toBe('a');
    expect(normalizeAnswer('to', 'en')).toBe('to');
    expect(normalizeAnswer('le', 'fr')).toBe('le');
  });
});

describe('editDistance', () => {
  it('counts slips and gives up past the limit', () => {
    expect(editDistance('house', 'house')).toBe(0);
    expect(editDistance('hous', 'house')).toBe(1);
    expect(editDistance('hoise', 'house')).toBe(1);
    expect(editDistance('cat', 'elephant', 2)).toBeGreaterThan(2);
  });
});

describe('answers', () => {
  const word = { accept: ['school', 'schooling'], y: 10 };
  it('matches exactly', () => {
    expect(isExact(word, 'school')).toBe(true);
    expect(isExact(word, 'scho')).toBe(false);
    expect(isExact(word, '')).toBe(false);
  });

  it('forgives a slip only on longer answers', () => {
    expect(isClose(word, 'scholl')).toBe(true);
    expect(isClose({ accept: ['cat'], y: 0 }, 'cap')).toBe(false);
    expect(isClose({ accept: ['house'], y: 0 }, 'hose')).toBe(true);
    expect(isClose({ accept: ['house'], y: 0 }, 'hou')).toBe(false);
  });

  it('knows when a short answer could still grow into a longer one', () => {
    const words = [{ accept: ['eat'], y: 0 }, { accept: ['eater'], y: 0 }];
    expect(isStillTyping(words, 'eat')).toBe(true);
    expect(isStillTyping(words, 'eater')).toBe(false);
  });

  it('locks onto the lowest word the typing is heading for', () => {
    const high = { accept: ['house'], y: 20, id: 'a' };
    const low = { accept: ['horse'], y: 70, id: 'b' };
    expect(lockedTarget([high, low], 'ho')?.id).toBe('b');
    expect(lockedTarget([high, low], 'hou')?.id).toBe('a');
    expect(lockedTarget([high, low], 'x')).toBeNull();
    expect(lockedTarget([high, low], '')).toBeNull();
  });
});

describe('hintFor', () => {
  it('shows the first letter and the length', () => {
    expect(hintFor('house')).toBe('h····');
    expect(hintFor('roll call')).toBe('r··· ····');
  });
});
