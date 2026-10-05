/**
 * The fairness rules (exam-pronunciation plan §2): accents are never errors,
 * French R is never reported, recognition disagreement and poor signal
 * suppress, a single recogniser only reports very-low words.
 */
import { describe, expect, it } from 'vitest';
import { FAIRNESS_CONFIG, inferCategory, judgeTurn, judgeTurns } from '../fairness';
import { bad, ev, turn } from './evidenceFixture';

const only = (words: Parameters<typeof turn>[1], overrides: Parameters<typeof turn>[2] = {}) =>
  judgeTurn(turn(7, words, overrides));

describe('inferCategory (orthographic, inferred)', () => {
  it.each([
    ['bon', null, 'nasalVowel'],
    ['pain', null, 'nasalVowel'],
    ['souvent', null, 'nasalVowel'],
    ['bonne', null, null],
    ['une', null, null],
    ['tout', null, 'vowelQuality'],
    ['les', null, 'vowelQuality'],
    ['petit', null, 'silentEnding'],
    ['viennent', 'ils', 'silentEnding'],
    ['ont', 'ils', 'liaison'],
    ['amis', 'les', 'liaison'],
    ['bus', null, null],
    ['chapeau', null, null],
  ] as const)('%s (after %s) -> %s', (word, prev, expected) => {
    expect(inferCategory(word, prev)).toBe(expected);
  });
});

describe('rule 1: accent-range scores are not reported', () => {
  it('a categorised word at the floor or above is suppressed', () => {
    const [v] = only([ev('Je'), bad('bon', FAIRNESS_CONFIG.accuracyFloor)]);
    expect(v.reported).toBe(false);
    expect(v.reasons).toEqual(['above_floor']);
  });

  it.each([50, 60, 70, 80])('a mid-range score (%i) is never reported', (score) => {
    expect(only([ev('Je'), bad('bon', score)])[0].reported).toBe(false);
  });

  it('a categorised word below the floor is reported', () => {
    const [v] = only([ev('Je'), bad('bon', 30)]);
    expect(v).toMatchObject({ reported: true, reasons: [], category: 'nasalVowel', word: 'bon', lowerConfidence: false });
  });

  it('a word Azure did not call mispronounced gets no verdict at all, whatever its accuracy', () => {
    expect(only([ev('bon', { accuracyScore: 5 }), ev('vent', { errorType: null, accuracyScore: 5 })])).toEqual([]);
  });
});

describe('rule 2: only meaning-carrying categories', () => {
  it('an uncategorised word is reported only below the very-low floor', () => {
    expect(only([ev('Je'), bad('chapeau', 35)])[0].reasons).toEqual(['not_meaning_carrying']);
    expect(only([ev('Je'), bad('chapeau', 25)])[0].reported).toBe(true);
  });

  it('French R is never reported, at any score, in any category', () => {
    for (const word of ['rouge', 'prendre', 'trois', 'parler', 'arbre']) {
      const [v] = only([ev('Je'), bad(word, 1)]);
      expect(v.reported).toBe(false);
      expect(v.reasons).toContain('may_be_french_r');
    }
  });
});

describe('rule 3: recognition agreement', () => {
  it('a word the two recognisers disagree on is suppressed', () => {
    const [v] = only([ev('Je'), bad('bon', 10, { recognizersAgree: false, examWord: 'beau' })]);
    expect(v.reported).toBe(false);
    expect(v.reasons).toContain('asr_disagreement');
  });

  it('a word with no aligned exam word is suppressed', () => {
    const [v] = only([ev('Je'), bad('bon', 10, { recognizersAgree: null, examWord: null })]);
    expect(v.reasons).toContain('asr_disagreement');
  });

  it('single-recogniser mode applies only the very-low floor and marks lower confidence', () => {
    const single = { singleRecognizer: true };
    const above = only([ev('Je', { recognizersAgree: null }), bad('bon', 40, { recognizersAgree: null })], single);
    expect(above[0].reasons).toEqual(['above_floor']);
    const below = only([ev('Je', { recognizersAgree: null }), bad('bon', 20, { recognizersAgree: null })], single);
    expect(below[0]).toMatchObject({ reported: true, lowerConfidence: true });
  });
});

describe('rule 4: signal quality and word shape', () => {
  it.each([
    ['near_seam', { nearChunkBoundary: true }, {}],
    ['clipped', {}, { clippedRatio: 0.05 }],
    ['low_snr', {}, { snrDb: 4 }],
    ['low_confidence', {}, { azureConfidence: 0.2 }],
  ] as const)('%s suppresses', (reason, wordOverrides, turnOverrides) => {
    const [v] = only([ev('Je'), bad('bon', 10, wordOverrides)], turnOverrides);
    expect(v.reported).toBe(false);
    expect(v.reasons).toContain(reason);
  });

  it('unknown signal values do not suppress', () => {
    const [v] = only([ev('Je'), bad('bon', 10)], { snrDb: null, azureConfidence: null, clippedRatio: null });
    expect(v.reported).toBe(true);
  });

  it.each([
    ['short_word', 'en'],
    ['number', '15'],
    ['loanword', 'sandwich'],
  ] as const)('%s is never reported', (reason, word) => {
    const [v] = only([ev('Je'), bad(word, 5)]);
    expect(v.reported).toBe(false);
    expect(v.reasons).toContain(reason);
  });

  it('a capitalised word mid-turn is a proper noun', () => {
    const [v] = only([ev('Je'), ev('vais'), ev('à'), bad('londres', 5, { examWord: 'Londres' })]);
    expect(v.reasons).toContain('proper_noun');
  });

  it("the backend assessor's reasons are kept", () => {
    const [v] = only([ev('Je'), bad('bon', 10, { suppressed: ['near_seam'] })]);
    expect(v.reasons).toEqual(['near_seam']);
  });
});

describe('turn handling', () => {
  it('a turn Azure could not assess yields nothing', () => {
    expect(only([bad('bon', 5)], { couldNotAssess: true })).toEqual([]);
  });

  it('judgeTurns walks turns in seq order and shows the exam-transcript spelling', () => {
    const verdicts = judgeTurns([
      turn(12, [ev('Je'), bad('vent', 10, { examWord: 'Vent' })]),
      turn(3, [ev('Je'), bad('bon', 10)]),
    ]);
    expect(verdicts.map((v) => v.turnKey)).toEqual([3, 12]);
    // Capitalised mid-turn: a proper-noun guess wins (conservative).
    expect(verdicts[1]).toMatchObject({ word: 'Vent', reported: false });
  });
});
