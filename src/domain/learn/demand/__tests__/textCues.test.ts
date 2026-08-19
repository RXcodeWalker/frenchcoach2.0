import { describe, it, expect } from 'vitest';
import { hasStructureCue, hasTimeFrameCue, normalizeQuestionText, wordCount, cue } from '../textCues';

describe('cue — Unicode-aware word boundary', () => {
  it('matches a cue word immediately preceded by an accented letter boundary', () => {
    // Regression: JS `\b` is ASCII-only and silently fails to recognise
    // accented letters as word characters, so `/\bdéjà\b/` never matched
    // "as-tu déjà fait" at all (found while building Stage 3 inference).
    expect(cue('\\bdéjà\\b').test('as-tu déjà fait du camping')).toBe(true);
  });

  it('does not match a substring without a real boundary', () => {
    expect(cue('\\bva\\b').test('vacances')).toBe(false);
  });

  it('matches at the very start and end of the string', () => {
    expect(cue('\\bhier\\b').test('hier')).toBe(true);
  });
});

describe('hasTimeFrameCue — present', () => {
  it.each([
    'es-tu prêt ?',
    'as-tu un animal ?',
    "est-ce que tu aimes l'école ?",
    'que fais-tu le soir ?',
    'décris ta famille.',
    'parle-moi de ton école.',
    'quel est ton plat préféré ?',
    'quelles sont tes matières préférées ?',
    'tu préfères les vacances actives ?',
    'penses-tu que la triche est un problème ?',
    "aimes-tu bricoler ?",
    "t'intéresses-tu au jardinage ?",
    'comment est ta relation avec tes parents ?',
    'peut-on réduire le gaspillage ?',
    'y a-t-il un parc près de chez toi ?',
    'comment ta ville lutte-t-elle contre la pollution ?',
  ])('detects a present cue in %p', (text) => {
    expect(hasTimeFrameCue(text, 'present')).toBe(true);
  });
});

describe('hasTimeFrameCue — past', () => {
  it.each([
    'as-tu déjà fait du camping ?',
    'quand tu étais petit, que faisais-tu ?',
    "qu'est-ce que tu as fait la semaine dernière ?",
    'où es-tu allé le week-end dernier ?',
    "qu'est-ce que tu as mangé hier soir ?",
    'comment ta ville a-t-elle changé ces dernières années ?',
    'as-tu déjà participé à un échange scolaire ?',
  ])('detects a past cue in %p', (text) => {
    expect(hasTimeFrameCue(text, 'past')).toBe(true);
  });

  it('does not tag past on a plain present-tense question', () => {
    expect(hasTimeFrameCue('décris ta famille.', 'past')).toBe(false);
  });
});

describe('hasTimeFrameCue — future', () => {
  it.each([
    'vas-tu voyager cette année ?',
    "qu'est-ce que tu vas faire l'année prochaine ?",
    'que feras-tu plus tard ?',
    'comment vois-tu ta vie dans dix ans ?',
  ])('detects a future cue in %p', (text) => {
    expect(hasTimeFrameCue(text, 'future')).toBe(true);
  });
});

describe('hasTimeFrameCue — conditional', () => {
  it.each(['si tu étais le proviseur...', 'aimerais-tu voyager ?', 'voudrais-tu déménager ?', 'pourrais-tu expliquer ?'])(
    'detects a conditional cue in %p',
    (text) => {
      expect(hasTimeFrameCue(text, 'conditional')).toBe(true);
    },
  );
});

describe('hasStructureCue', () => {
  it('detects opinion cues', () => {
    expect(hasStructureCue('à ton avis, est-ce utile ?', 'opinion')).toBe(true);
  });

  it('detects justification cues', () => {
    expect(hasStructureCue('pourquoi aimes-tu le sport ?', 'justification')).toBe(true);
  });

  it('detects comparison cues', () => {
    expect(hasStructureCue('tu préfères la mer ou la montagne ?', 'comparison')).toBe(true);
  });

  it('returns true (never warns) for a structure with no cue list', () => {
    expect(hasStructureCue('quelque chose', 'perfect')).toBe(true);
  });

  it('returns false when no cue matches a checkable structure', () => {
    expect(hasStructureCue('décris ta famille.', 'subjunctive')).toBe(false);
  });
});

describe('normalizeQuestionText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeQuestionText('  Décris   TA Famille.  ')).toBe('décris ta famille.');
  });

  it('normalises curly apostrophes to straight', () => {
    expect(normalizeQuestionText("Qu'est-ce que tu fais ?")).toBe("qu'est-ce que tu fais ?");
  });
});

describe('wordCount', () => {
  it('counts words, ignoring punctuation', () => {
    expect(wordCount('Décris ta famille, tes amis et ton école.')).toBe(8);
  });

  it('returns 0 for an empty string', () => {
    expect(wordCount('')).toBe(0);
  });
});
