import { describe, it, expect } from 'vitest';
import {
  normalizeAcceptableAnswers,
  matchTypedAnswer,
} from '../utils/matchAnswer';

describe('normalizeAcceptableAnswers', () => {
  it('normalizes a single string', () => {
    expect(normalizeAcceptableAnswers('Bonjour!')).toEqual(['bonjour']);
  });

  it('normalizes each entry in an array', () => {
    expect(normalizeAcceptableAnswers(['Oui', 'Si'])).toEqual(['oui', 'si']);
  });
});

describe('matchTypedAnswer', () => {
  it('matches a single acceptable answer', () => {
    expect(matchTypedAnswer('bonjour', 'Bonjour!')).toBe(true);
  });

  it('matches any entry in an acceptable array', () => {
    expect(matchTypedAnswer('si', ['oui', 'si'])).toBe(true);
    expect(matchTypedAnswer('non', ['oui', 'si'])).toBe(false);
  });

  it('is accent- and punctuation-insensitive', () => {
    expect(matchTypedAnswer('  café  ', 'Café.')).toBe(true);
    expect(matchTypedAnswer("j'ai", "J'ai")).toBe(true);
  });

  it('rejects wrong answers', () => {
    expect(matchTypedAnswer('merci', 'bonjour')).toBe(false);
  });
});
