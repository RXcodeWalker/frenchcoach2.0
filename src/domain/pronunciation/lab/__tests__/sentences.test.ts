import { describe, expect, it } from 'vitest';
import { splitSentences } from '../sentences';

describe('splitSentences', () => {
  it('splits at . ! ? … followed by space, keeping each end mark', () => {
    expect(splitSentences("J'aime le sport. Et toi ? Super ! Alors… on y va.")).toEqual([
      "J'aime le sport.",
      'Et toi ?',
      'Super !',
      'Alors…',
      'on y va.',
    ]);
  });

  it('treats line breaks and runs of spaces as one space, and trims', () => {
    expect(splitSentences('  Bonjour.\n\nÇa  va ?  ')).toEqual(['Bonjour.', 'Ça va ?']);
  });

  it('does not split inside a number or after a colon or comma', () => {
    expect(splitSentences("Il a 3,5 ans et j'en ai 16. Voilà : fini, merci.")).toEqual([
      "Il a 3,5 ans et j'en ai 16.",
      'Voilà : fini, merci.',
    ]);
  });

  it('normalises to NFC and drops pieces with no letter', () => {
    expect(splitSentences('Café. ... 12 .')).toEqual(['Café.']);
    expect(splitSentences('')).toEqual([]);
  });
});
