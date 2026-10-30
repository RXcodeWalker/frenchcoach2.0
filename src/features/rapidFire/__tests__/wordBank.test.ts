import { describe, expect, it } from 'vitest';
import { getWordSet, getWordSets, parseVocab } from '../wordBank';

describe('parseVocab', () => {
  it('expands a feminine ending in brackets', () => {
    expect(parseVocab('fascinating', 'fascinant(e)')).toEqual([{ prompt: 'fascinating', answers: ['fascinant', 'fascinante'] }]);
    expect(parseVocab('boring', 'ennuyeux(se)')[0].answers).toEqual(['ennuyeux', 'ennuyeuse']);
    expect(parseVocab('sporty', 'sportif(ve)')[0].answers).toEqual(['sportif', 'sportive']);
    expect(parseVocab('meticulous', 'méticuleux(euse)')[0].answers).toEqual(['méticuleux', 'méticuleuse']);
    expect(parseVocab('a tailor', 'couturier(ère)')[0].answers).toEqual(['couturier', 'couturière']);
    expect(parseVocab('boring', 'ennuyeux/euse')[0].answers).toEqual(['ennuyeux', 'ennuyeuse']);
  });

  it('expands "le/la" into both articles', () => {
    expect(parseVocab('headteacher', 'le/la proviseur(e)')[0].answers).toEqual([
      'le proviseur', 'le proviseure', 'la proviseur', 'la proviseure',
    ]);
  });

  it('splits antonym pairs written with the same number of slashes on both sides', () => {
    expect(parseVocab('useful/useless', 'utile/inutile')).toEqual([
      { prompt: 'useful', answers: ['utile'] },
      { prompt: 'useless', answers: ['inutile'] },
    ]);
  });

  it('keeps one card when the English lists synonyms for a single French word', () => {
    expect(parseVocab('however / on the other hand', 'en revanche')).toEqual([
      { prompt: 'however / on the other hand', answers: ['en revanche'] },
    ]);
  });

  it('treats a slash in the French alone as alternatives', () => {
    expect(parseVocab('younger (sibling)', 'cadet/cadette')[0].answers).toEqual(['cadet', 'cadette']);
  });

  it('makes a bracketed word optional and an equals-note an alternative', () => {
    expect(parseVocab('to get along (well)', "s'entendre (bien)")[0].answers).toEqual(["s'entendre", "s'entendre bien"]);
    expect(parseVocab('nice', 'sympa (= sympathique)')[0].answers).toEqual(['sympa', 'sympathique']);
  });

  it('drops entries that cannot be answered from the English alone', () => {
    expect(parseVocab('I find that...', 'je trouve que...')).toEqual([]);
    expect(parseVocab('to play (an instrument)', 'jouer de (+ instrument)')).toEqual([]);
    expect(parseVocab('', 'pain')).toEqual([]);
  });

  it('drops answers too long for a sprint', () => {
    expect(parseVocab('a long phrase', 'une très longue expression française complète')).toEqual([]);
  });
});

describe('word sets', () => {
  const sets = getWordSets();

  it('offers Mixed, Phrases, Everyday objects and the sixteen core topics', () => {
    expect(sets.slice(0, 3).map(s => s.id)).toEqual(['mixed', 'phrases', 'objects']);
    expect(sets.filter(s => s.kind === 'topic')).toHaveLength(16);
    expect(getWordSet('school')?.topicKey).toBe('school');
    expect(getWordSet('nope')).toBeUndefined();
  });

  it('never lists a gated advanced topic', () => {
    expect(getWordSet('pro')).toBeUndefined();
    expect(getWordSet('slang')).toBeUndefined();
  });

  it('gives every set enough cards for a varied minute', () => {
    for (const s of sets) {
      expect(s.words.length, s.id).toBeGreaterThanOrEqual(s.kind === 'topic' ? 40 : 30);
    }
  });

  it('has only typable cards: a prompt, short answers, a level of 1 to 3', () => {
    for (const s of sets) {
      for (const w of s.words) {
        expect(w.prompt.trim(), `${s.id}/${w.id}`).not.toBe('');
        expect(w.answers.length, w.prompt).toBeGreaterThan(0);
        for (const a of w.answers) {
          expect(a, w.prompt).not.toMatch(/[()/+]|\.\.\./);
          expect(a.split(/\s+/).length, a).toBeLessThanOrEqual(8);
        }
        expect([1, 2, 3]).toContain(w.level);
      }
    }
  });

  it('shows each English prompt once per set', () => {
    for (const s of sets) {
      const prompts = s.words.map(w => w.prompt.toLowerCase());
      expect(new Set(prompts).size, s.id).toBe(prompts.length);
    }
  });

  it('has every level to ramp through in the larger sets', () => {
    for (const id of ['mixed', 'school', 'food', 'hobbies']) {
      const levels = new Set(getWordSet(id)!.words.map(w => w.level));
      expect([...levels].sort()).toEqual([1, 2, 3]);
    }
  });

  it('has unique ids', () => {
    const mixed = getWordSet('mixed')!.words;
    expect(new Set(mixed.map(w => w.id)).size).toBe(mixed.length);
  });
});
