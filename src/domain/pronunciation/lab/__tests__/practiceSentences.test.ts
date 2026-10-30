import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../../../data/questions';
import { PRACTICE_SENTENCE, pickPracticeSentences, practiceSentencesOf, sentenceHasFamily } from '../practiceSentences';
import { splitSentences } from '../sentences';

describe('practiceSentences', () => {
  it('keeps sentences of a sayable length, in order, each exactly as splitSentences gives it', () => {
    const text = 'Oui. J’habite à Paris avec ma famille. ' + 'mot '.repeat(25).trim() + '. Nous aimons le sport.';
    const out = practiceSentencesOf(text);
    expect(out).toEqual(['J’habite à Paris avec ma famille.', 'Nous aimons le sport.']);
    for (const s of out) expect(splitSentences(text)).toContain(s);
    expect(PRACTICE_SENTENCE.minWords).toBeLessThan(PRACTICE_SENTENCE.maxWords);
  });

  it('finds a family by the same spelling rules as "watch out for"', () => {
    expect(sentenceHasFamily('Les enfants jouent dans le jardin.', 'liaison')).toBe(true);
    expect(sentenceHasFamily('Je mange du pain.', 'liaison')).toBe(false);
    expect(sentenceHasFamily('Le vin est bon.', 'nasalIn')).toBe(true);
  });

  it('picks distinct sentences, honours the limit and the sound filter, and is reproducible', () => {
    const texts = ['Les enfants jouent dans le jardin. Il fait beau aujourd’hui.', 'Les enfants jouent dans le jardin. Nous avons un chien.'];
    const all = pickPracticeSentences(texts, { limit: 10, rng: () => 0.3 });
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(3);
    expect(pickPracticeSentences(texts, { limit: 2, rng: () => 0.3 })).toHaveLength(2);
    const liaison = pickPracticeSentences(texts, { limit: 10, family: 'liaison', rng: () => 0.3 });
    expect(liaison.length).toBeGreaterThan(0);
    for (const s of liaison) expect(sentenceHasFamily(s, 'liaison')).toBe(true);
    expect(pickPracticeSentences(texts, { limit: 10, rng: () => 0.3 })).toEqual(all);
  });

  it('finds sentences for every family in the real question bank, quickly (all of them are recorded)', () => {
    const texts = QUESTIONS.map((q) => q.modelAnswer);
    const started = Date.now();
    for (const family of ['frenchR', 'uOu', 'nasalAn', 'nasalOn', 'nasalIn', 'eAccents', 'eu', 'silentFinal', 'liaison', 'elision', 'gnIll', 'oi'] as const) {
      const found = pickPracticeSentences(texts, { limit: 8, family });
      expect(found.length, family).toBeGreaterThanOrEqual(3);
    }
    expect(Date.now() - started).toBeLessThan(4000);
  });
});
