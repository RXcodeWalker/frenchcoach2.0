import { describe, it, expect } from 'vitest';
import { QUESTIONS } from '../../../../data/questions';
import {
  inferCognitiveDemand,
  inferTimeFrames,
  inferStructures,
  inferResponseLoad,
  inferLexicalReach,
  inferSufficientAnswer,
  inferQuestionDemands,
} from '../infer';

describe('inferCognitiveDemand', () => {
  it.each<[string, string]>([
    ['Si tu étais le proviseur, qu\'est-ce que tu changerais ?', 'hypothesize'],
    ['Si tu gagnais à la loterie, où irais-tu ?', 'hypothesize'],
    ['Tu préfères les vacances à la mer ou à la montagne ?', 'compare'],
    ['Compare les avantages et les inconvénients.', 'compare'],
    ['À ton avis, est-ce une bonne idée ?', 'justify'],
    ['Est-ce que tu aimes ton école ? Pourquoi ou pourquoi pas ?', 'justify'],
    ['Que penses-tu du règlement scolaire ?', 'justify'],
    ['Comment tu vas à l\'école chaque matin ?', 'explain'],
    ['Pourquoi est-il important d\'apprendre des langues ?', 'explain'],
    ['Décris ta famille.', 'describe'],
    ['Parle-moi de ton école.', 'describe'],
    ['Qu\'est-ce que tu fais pendant ton temps libre ?', 'describe'],
    ['Quel est ton plat préféré ?', 'describe'],
  ])('classifies %p as %s', (text, expected) => {
    expect(inferCognitiveDemand(text).demand).toBe(expected);
  });

  it('falls back to describe with confidence below the floor when nothing matches', () => {
    const result = inferCognitiveDemand('xyz abc 123');
    expect(result.demand).toBe('describe');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('priority: hypothesize framing wins over an embedded pourquoi', () => {
    // Rule 1 (docs §13.1): cognitiveDemand reflects what the wording forces —
    // a "si tu" conditional frame dominates even if "pourquoi" also appears.
    const result = inferCognitiveDemand('Si tu pouvais changer une chose, pourquoi le ferais-tu ?');
    expect(result.demand).toBe('hypothesize');
  });
});

describe('inferTimeFrames', () => {
  it('detects multiple cued frames', () => {
    expect(inferTimeFrames('Si tu étais le proviseur, qu\'est-ce que tu changerais ?')).toEqual(
      expect.arrayContaining(['present', 'conditional']),
    );
  });

  it('detects past', () => {
    expect(inferTimeFrames('Qu\'est-ce que tu as fait la semaine dernière ?')).toContain('past');
  });

  it('detects future', () => {
    expect(inferTimeFrames('Qu\'est-ce que tu vas faire l\'année prochaine ?')).toContain('future');
  });

  it('falls back to present (never empty) when nothing is cued — required by types.ts timeFrames >=1', () => {
    const result = inferTimeFrames('xyz abc 123');
    expect(result).toEqual(['present']);
  });

  it('never returns an empty array (missing-time-frame guard)', () => {
    for (const q of QUESTIONS) {
      expect(inferTimeFrames(q.text).length).toBeGreaterThan(0);
    }
  });
});

describe('inferStructures', () => {
  it('detects opinion', () => {
    expect(inferStructures('À ton avis, est-ce une bonne idée ?')).toContain('opinion');
  });

  it('detects justification', () => {
    expect(inferStructures('Pourquoi aimes-tu le sport ?')).toContain('justification');
  });

  it('detects comparison', () => {
    expect(inferStructures('Tu préfères la mer ou la montagne ?')).toContain('comparison');
  });

  it('detects conditional', () => {
    expect(inferStructures('Si tu étais le proviseur...')).toContain('conditional');
  });

  it('returns an empty array when nothing is elicited', () => {
    expect(inferStructures('Décris ta famille.')).toEqual([]);
  });

  it('is derived from question text, not modelAnswer — the §3.5 circularity fix', () => {
    // A question with no comparison wording must not be tagged 'comparison'
    // even if some unrelated model-answer-style text would contain it.
    const structures = inferStructures('Décris ta chambre.');
    expect(structures).not.toContain('comparison');
  });
});

describe('inferResponseLoad', () => {
  it('floors justify/compare/hypothesize at developed, never short (validator short-load-on-high-demand)', () => {
    expect(['developed', 'extended']).toContain(inferResponseLoad('justify', 'Pourquoi ?', 'Say why.', 1));
    expect(['developed', 'extended']).toContain(inferResponseLoad('compare', 'A ou B ?', 'Compare.', 1));
    expect(['developed', 'extended']).toContain(inferResponseLoad('hypothesize', 'Si tu... ?', 'Imagine.', 1));
  });

  it('allows describe to be short when the hint is terse', () => {
    expect(inferResponseLoad('describe', 'Décris ta chambre.', 'One detail.', 1)).toBe('short');
  });

  it('reads extended from a hint enumerating >=4 countable items', () => {
    const hint = 'Talk about your school — size, subjects, teachers, uniform, facilities.';
    expect(inferResponseLoad('describe', 'Parle-moi de ton école.', hint, 1)).toBe('extended');
  });

  it('bumps load by one step when the question text is multi-goal (>=2 question marks)', () => {
    const withoutBump = inferResponseLoad('describe', 'Tu aimes le sport ?', 'One detail.', 1);
    const withBump = inferResponseLoad(
      'describe',
      'Tu aimes le sport ? Lequel préfères-tu ?',
      'One detail.',
      1,
    );
    const rank = { short: 0, developed: 1, extended: 2 };
    expect(rank[withBump]).toBeGreaterThan(rank[withoutBump]);
  });

  it('difficulty is a tie-breaker only, not a primary signal (§13.1) — changing difficulty alone never changes the result when text/hint are held fixed at difficulty>=2', () => {
    const text = 'Décris ta famille.';
    const hint = 'One detail.';
    const atTwo = inferResponseLoad('describe', text, hint, 2);
    const atThree = inferResponseLoad('describe', text, hint, 3);
    expect(atTwo).toBe(atThree);
  });
});

describe('inferLexicalReach', () => {
  it('detects abstract via suffix morphology', () => {
    expect(inferLexicalReach('Que penses-tu de la mondialisation ?')).toBe('abstract');
  });

  it('detects abstract via topic keyword', () => {
    expect(inferLexicalReach("Qu'est-ce que tu fais pour protéger l'environnement ?")).toBe('abstract');
  });

  it('defaults to everyday with no abstract signal', () => {
    expect(inferLexicalReach('Décris ta chambre.')).toBe('everyday');
  });
});

describe('inferSufficientAnswer', () => {
  it('seeds verbatim from a hint that already clears the 8-word floor', () => {
    const hint = 'Talk about your school — size, subjects, teachers, uniform, facilities.';
    expect(inferSufficientAnswer(hint)).toBe(hint);
  });

  it('pads a short list-style hint with a countable-requirement prefix', () => {
    const hint = 'Carnival, music festival, market, or fair.';
    const result = inferSufficientAnswer(hint);
    expect(result.split(/\s+/).length).toBeGreaterThanOrEqual(8);
    expect(result).toContain(hint);
  });

  it('pads a short single-clause hint without inventing new claims (contains the original hint verbatim)', () => {
    const hint = 'Compare country life with city life.';
    const result = inferSufficientAnswer(hint);
    expect(result.split(/\s+/).length).toBeGreaterThanOrEqual(8);
    expect(result).toContain(hint);
  });

  it('never introduces a banned vague phrase', () => {
    const banned = ['something about it', 'talks about it', 'gives some information', 'says something'];
    for (const q of QUESTIONS) {
      const answer = inferSufficientAnswer(q.hint).toLowerCase();
      for (const phrase of banned) {
        expect(answer).not.toContain(phrase);
      }
    }
  });
});

describe('inferQuestionDemands — composition', () => {
  it('always sets provenance to inferred with a numeric inferenceConfidence', () => {
    const d = inferQuestionDemands({ text: 'Décris ta famille.', hint: 'One detail here please.', difficulty: 1 });
    expect(d.provenance).toBe('inferred');
    expect(typeof d.inferenceConfidence).toBe('number');
  });

  it('falls back to describe when cognitiveDemand confidence is below the §13.2 valve-4 floor', () => {
    const d = inferQuestionDemands({ text: 'xyz abc 123', hint: 'Something with enough words here please.', difficulty: 1 });
    expect(d.cognitiveDemand).toBe('describe');
  });

  it('is deterministic: repeated calls on the same input produce identical output', () => {
    const input = { text: 'Si tu étais le proviseur, qu\'est-ce que tu changerais ?', hint: 'Use conditional tense.', difficulty: 3 as const };
    const first = inferQuestionDemands(input);
    const second = inferQuestionDemands(input);
    expect(second).toEqual(first);
  });

  it('responseLoad and lexicalReach change when the question text changes but difficulty does not (§13.1 circularity check)', () => {
    const difficulty = 2 as const;
    const short = inferQuestionDemands({
      text: 'Décris ta chambre.',
      hint: 'One detail.',
      difficulty,
    });
    const long = inferQuestionDemands({
      text: 'Que penses-tu de la mondialisation et de son impact sur la société ?',
      hint: 'Discuss globalisation, its economic impact, its cultural impact, and its political impact in detail.',
      difficulty,
    });
    expect(short.responseLoad).not.toBe(long.responseLoad);
    expect(short.lexicalReach).not.toBe(long.lexicalReach);
  });

  it('is stable across all 428 real questions: never throws, always produces a valid non-empty timeFrames array', () => {
    for (const q of QUESTIONS) {
      const d = inferQuestionDemands({ text: q.text, hint: q.hint, difficulty: q.difficulty });
      expect(d.timeFrames.length).toBeGreaterThan(0);
      expect(d.provenance).toBe('inferred');
      expect(d.inferenceConfidence).toBeGreaterThanOrEqual(0);
      expect(d.inferenceConfidence).toBeLessThanOrEqual(1);
    }
  });

  it('never produces short responseLoad for justify/compare/hypothesize across the real corpus', () => {
    for (const q of QUESTIONS) {
      const d = inferQuestionDemands({ text: q.text, hint: q.hint, difficulty: q.difficulty });
      if (['justify', 'compare', 'hypothesize'].includes(d.cognitiveDemand)) {
        expect(d.responseLoad).not.toBe('short');
      }
    }
  });

  it('never produces a sufficientAnswer under the 8-word validator floor across the real corpus', () => {
    for (const q of QUESTIONS) {
      const d = inferQuestionDemands({ text: q.text, hint: q.hint, difficulty: q.difficulty });
      const words = d.sufficientAnswer.trim().split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(8);
    }
  });
});
