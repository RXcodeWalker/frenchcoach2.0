import { describe, it, expect } from 'vitest';
import { normalizeFrench } from '../utils/normalizeFrench';

describe('normalizeFrench', () => {
  it('lowercases and strips accents via NFD', () => {
    expect(normalizeFrench('Élève')).toBe('eleve');
    expect(normalizeFrench('café')).toBe('cafe');
    expect(normalizeFrench('naïve')).toBe('naive');
  });

  it('strips punctuation including hyphens', () => {
    expect(normalizeFrench('Bonjour!')).toBe('bonjour');
    expect(normalizeFrench('Comment allez-vous?')).toBe('comment allezvous');
    expect(normalizeFrench('Oui, merci.')).toBe('oui merci');
  });

  it('collapses extra whitespace', () => {
    expect(normalizeFrench('  je   mange  ')).toBe('je mange');
  });

  it('preserves apostrophes in contractions', () => {
    expect(normalizeFrench("J'ai")).toBe("j'ai");
    expect(normalizeFrench("j'ai faim")).toBe("j'ai faim");
  });

  it('handles combined accent + punctuation + spacing', () => {
    expect(normalizeFrench('  À bientôt!!!  ')).toBe('a bientot');
  });
});
