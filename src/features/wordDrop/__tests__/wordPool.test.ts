import { describe, expect, it } from 'vitest';
import { buildPool, cleanFrench, englishSenses, frenchAnswers, getWordPool, parsePair, playWords, topicCounts } from '../wordPool';

describe('cleanFrench', () => {
  it('keeps plain words and short phrases', () => {
    expect(cleanFrench('la bibliothèque')).toBe('la bibliothèque');
    expect(cleanFrench("s'amuser")).toBe("s'amuser");
    expect(cleanFrench('avoir hâte de')).toBe('avoir hâte de');
  });

  it('rejects frames, alternatives, questions and long phrases', () => {
    expect(cleanFrench('je trouve que...')).toBeNull();
    expect(cleanFrench('mon école s\'appelle…')).toBeNull();
    expect(cleanFrench('utile/inutile')).toBeNull();
    expect(cleanFrench('jouer de (+ instrument)')).toBeNull();
    expect(cleanFrench('est-ce que tu viens?')).toBeNull();
    expect(cleanFrench('pour aller à la gare maintenant')).toBeNull();
  });
});

describe('frenchAnswers', () => {
  it('accepts a bracketed gender ending with or without it', () => {
    expect(frenchAnswers('fascinant(e)').sort()).toEqual(['fascinant', 'fascinante']);
    expect(frenchAnswers('la cantine')).toEqual(['cantine']);
  });
});

describe('englishSenses', () => {
  it('splits a gloss into its senses and drops asides', () => {
    expect(englishSenses('the register / roll call')).toEqual(['the register', 'roll call']);
    expect(englishSenses('to play (an instrument)')).toEqual(['to play']);
    expect(englishSenses('kind, caring')).toEqual(['kind', 'caring']);
    expect(englishSenses('a test or assessment')).toEqual(['a test', 'assessment']);
  });

  it('gives nothing for an unfinished gloss', () => {
    expect(englishSenses('My favourite subject is…')).toEqual([]);
  });
});

describe('parsePair', () => {
  it('builds a playable word with every answer worth accepting', () => {
    const w = parsePair('réviser', 'to revise / study', 'school');
    expect(w).toMatchObject({ id: 'reviser', fr: 'réviser', en: 'to revise', topicKey: 'school' });
    expect(w?.enAnswers).toEqual(['revise', 'study']);
    expect(w?.frAnswers).toEqual(['reviser']);
  });

  it('refuses a pair that cannot be played fairly', () => {
    expect(parsePair('je trouve que...', 'I find that...', 'school')).toBeNull();
    expect(parsePair('ok', 'a', 'school')).toBeNull();
  });
});

describe('buildPool / playWords', () => {
  const bank = [
    { topicKey: 'school', keyVocab: [{ fr: 'par contre', en: 'on the other hand' }, { fr: 'le temps', en: 'time' }] },
    { topicKey: 'home', keyVocab: [{ fr: 'en revanche', en: 'on the other hand' }, { fr: 'le temps', en: 'weather' }] },
  ];
  const pool = buildPool(bank);

  it('is unique by French word with answers merged', () => {
    expect(pool.map(w => w.id).sort()).toEqual(['en revanche', 'par contre', 'temps']);
    expect(pool.find(w => w.id === 'temps')?.enAnswers.sort()).toEqual(['time', 'weather']);
    expect(topicCounts(pool)).toEqual({ school: 2, home: 1 });
  });

  it('types English for French falling', () => {
    const play = playWords(pool, 'fr-en');
    expect(play.find(w => w.text === 'le temps')?.accept.sort()).toEqual(['time', 'weather']);
  });

  it('accepts either French word when the shared English falls', () => {
    const play = playWords(pool, 'en-fr');
    const shared = play.find(w => w.text === 'on the other hand');
    expect(shared?.accept.sort()).toEqual(['en revanche', 'par contre']);
    expect(play.filter(w => w.text === 'on the other hand')).toHaveLength(1);
  });
});

describe('the real question bank', () => {
  const pool = getWordPool();

  it('yields a deep pool across the core topics', () => {
    expect(pool.length).toBeGreaterThan(1500);
    const counts = topicCounts(pool);
    for (const key of ['school', 'hobbies', 'family', 'holidays', 'home', 'food']) {
      expect(counts[key]).toBeGreaterThan(80);
    }
  });

  it('only keeps words with answers a learner can type', () => {
    for (const w of pool) {
      expect(w.enAnswers.length).toBeGreaterThan(0);
      expect(w.frAnswers.length).toBeGreaterThan(0);
      expect(w.enAnswers.every(a => a.length >= 2)).toBe(true);
      expect(w.fr).not.toMatch(/[…?!+=:;,/]/);
    }
  });
});
