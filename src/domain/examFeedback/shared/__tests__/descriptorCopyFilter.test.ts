import { describe, it, expect } from 'vitest';
import { claimCopiesDescriptor } from '../descriptorCopyFilter';

const BULLETS = [
  'Justifies and explains some answers.',
  'Accurate use of a wide range of vocabulary with occasional errors.',
  'Minor errors (adjective endings, use of prepositions, etc.) are allowed.',
];

describe('claimCopiesDescriptor', () => {
  it('drops a claim containing a whole short bullet (5 words)', () => {
    expect(claimCopiesDescriptor('The answer justifies and explains some answers well.', BULLETS)).toBe(true);
  });

  it('is case- and punctuation-insensitive', () => {
    expect(claimCopiesDescriptor('JUSTIFIES AND EXPLAINS SOME ANSWERS!', BULLETS)).toBe(true);
  });

  it('drops a claim containing 8+ consecutive words of a long bullet', () => {
    expect(
      claimCopiesDescriptor('You show accurate use of a wide range of vocabulary, which is nice.', BULLETS),
    ).toBe(true);
  });

  it('keeps a claim with only a 7-word run of a long bullet', () => {
    expect(claimCopiesDescriptor('Accurate use of a wide range, though not here.', BULLETS)).toBe(false);
  });

  it('keeps claims written for the candidate', () => {
    expect(claimCopiesDescriptor('You gave a reason with "parce que" — that makes the answer fuller.', BULLETS)).toBe(false);
  });

  it('keeps a claim that only shares isolated words', () => {
    expect(claimCopiesDescriptor('Your vocabulary was varied and your answers were clear.', BULLETS)).toBe(false);
  });

  it('does not treat an empty bullet as a match', () => {
    expect(claimCopiesDescriptor('anything', [''])).toBe(false);
  });
});
