import { describe, expect, it } from 'vitest';
import type { PronunciationWordResult } from '../../types';
import {
  IPA_TO_FAMILY,
  SCORED_FAMILIES,
  SOUND_FAMILIES,
  familyStatuses,
  stableWordFamilies,
  wordFamilyObservations,
  type DatedObservation,
} from '../soundFamilies';

function word(text: string, accuracy: number, phonemes: Array<number | null>, extra: Partial<PronunciationWordResult> = {}): PronunciationWordResult {
  return {
    word: text,
    accuracyScore: accuracy,
    errorType: 'correct',
    confidence: null,
    phonemes: phonemes.map((a) => ({ phoneme: '', accuracyScore: a })),
    ...extra,
  };
}

describe('sound families', () => {
  it('has the 12 families of plan §5.2; liaison and elision are not scored', () => {
    expect(SOUND_FAMILIES).toHaveLength(12);
    expect(SCORED_FAMILIES).toHaveLength(10);
    expect(SCORED_FAMILIES).not.toContain('liaison');
    expect(SCORED_FAMILIES).not.toContain('elision');
  });

  it('maps the key IPA phonemes', () => {
    expect(IPA_TO_FAMILY['ʁ']).toBe('frenchR');
    expect(IPA_TO_FAMILY['y']).toBe('uOu');
    expect(IPA_TO_FAMILY['u']).toBe('uOu');
    expect(IPA_TO_FAMILY['ɑ̃']).toBe('nasalAn');
    expect(IPA_TO_FAMILY['ɔ̃']).toBe('nasalOn');
    expect(IPA_TO_FAMILY['ɛ̃']).toBe('nasalIn');
    expect(IPA_TO_FAMILY['ø']).toBe('eu');
    expect(IPA_TO_FAMILY['ɲ']).toBe('gnIll');
    expect(IPA_TO_FAMILY['a']).toBeUndefined();
  });

  it('every IPA_TO_FAMILY target is a scored family', () => {
    for (const family of Object.values(IPA_TO_FAMILY)) expect(SCORED_FAMILIES).toContain(family);
  });

  it('stableWordFamilies names what every reading of the word contains', () => {
    expect(stableWordFamilies('rouge')).toEqual(expect.arrayContaining(['frenchR', 'uOu']));
    expect(stableWordFamilies('moi')).toEqual(['oi']);
    expect(stableWordFamilies('souvent')).toEqual(['uOu']); // -ent: nasal or silent, so neither
  });
});

describe('wordFamilyObservations', () => {
  it('lines unnamed Azure phonemes up with the expected ones when the counts match', () => {
    // rouge = ʁ u ʒ: the weak middle phoneme is the U/OU sound.
    const evidence = wordFamilyObservations(word('rouge', 70, [95, 40, 90]));
    expect(evidence.aligned).toBe(true);
    expect(evidence.observations).toEqual([
      { family: 'frenchR', accuracy: 95, basis: 'phoneme' },
      { family: 'uOu', accuracy: 40, basis: 'phoneme' },
    ]);
  });

  it('attributes a nasal scored as two segments to the nasal family', () => {
    // The owner's recordings: vin with three scored segments, the tail low.
    const evidence = wordFamilyObservations(word('vin', 85, [100, 100, 47]));
    expect(evidence.observations).toEqual([
      { family: 'nasalIn', accuracy: 100, basis: 'phoneme' },
      { family: 'nasalIn', accuracy: 47, basis: 'phoneme' },
    ]);
  });

  it('adds silent finals at word level, using the word accuracy', () => {
    const evidence = wordFamilyObservations(word('petit', 62, [90, 80, 60, 70]));
    expect(evidence.observations).toContainEqual({ family: 'silentFinal', accuracy: 62, basis: 'word' });
  });

  it('keeps only positions every count-matching reading agrees on', () => {
    // souvent with 4 phonemes is s u v ɑ̃ (nasal) — the only 4-phoneme reading.
    const nasal = wordFamilyObservations(word('souvent', 80, [90, 85, 90, 50]));
    expect(nasal.observations).toContainEqual({ family: 'nasalAn', accuracy: 50, basis: 'phoneme' });
    // With 3 phonemes the -ent was silent: no nasal evidence; the silent ending counts at word level.
    const silent = wordFamilyObservations(word('souvent', 80, [90, 85, 90]));
    expect(silent.observations.map((o) => o.family)).not.toContain('nasalAn');
    expect(silent.observations).toContainEqual({ family: 'silentFinal', accuracy: 80, basis: 'word' });
  });

  it('counts an unalignable single-family word once, at word level', () => {
    const evidence = wordFamilyObservations(word('vin', 55, [90, 80, 70, 60, 50]));
    expect(evidence).toEqual({ aligned: false, observations: [{ family: 'nasalIn', accuracy: 55, basis: 'word' }] });
  });

  it('gives nothing for an unalignable word with several families', () => {
    expect(wordFamilyObservations(word('rouge', 55, [90, 80]))).toEqual({ aligned: false, observations: [] });
  });

  it('uses Azure phoneme names directly when they are present', () => {
    const named: PronunciationWordResult = {
      word: 'bon', accuracyScore: 88, errorType: 'correct', confidence: null,
      phonemes: [{ phoneme: 'b', accuracyScore: 90 }, { phoneme: 'ɔ̃', accuracyScore: 86 }],
    };
    expect(wordFamilyObservations(named).observations).toEqual([{ family: 'nasalOn', accuracy: 86, basis: 'phoneme' }]);
  });

  it('gives nothing for skipped, extra, unscored or seam words', () => {
    expect(wordFamilyObservations(word('rouge', 70, [95, 40, 90], { errorType: 'skipped' })).observations).toEqual([]);
    expect(wordFamilyObservations(word('rouge', 70, [95, 40, 90], { errorType: 'extra' })).observations).toEqual([]);
    expect(wordFamilyObservations(word('rouge', 70, [95, 40, 90], { accuracyScore: null })).observations).toEqual([]);
    expect(wordFamilyObservations(word('rouge', 70, [95, 40, 90], { nearChunkBoundary: true })).observations).toEqual([]);
  });
});

describe('familyStatuses', () => {
  const obs = (family: DatedObservation['family'], accuracy: number, day: string): DatedObservation => ({ family, accuracy, day, basis: 'phoneme' });

  it('needs ≥ 6 observations over ≥ 2 days before leaving "not enough data"', () => {
    const oneDay = Array.from({ length: 10 }, () => obs('frenchR', 90, '2026-10-01'));
    expect(familyStatuses(oneDay).frenchR).toBe('notEnoughData');
    const twoDaysFive = [...Array.from({ length: 3 }, () => obs('frenchR', 90, '2026-10-01')), obs('frenchR', 90, '2026-10-02'), obs('frenchR', 90, '2026-10-02')];
    expect(familyStatuses(twoDaysFive).frenchR).toBe('notEnoughData');
    expect(familyStatuses([...twoDaysFive, obs('frenchR', 90, '2026-10-02')]).frenchR).toBe('clear');
  });

  it('reads the mean of the recent observations', () => {
    const days = ['2026-10-01', '2026-10-02'];
    const at = (accuracy: number) => Array.from({ length: 6 }, (_, i) => obs('uOu', accuracy, days[i % 2]));
    expect(familyStatuses(at(70)).uOu).toBe('gettingThere');
    expect(familyStatuses(at(40)).uOu).toBe('needsWork');
    // Old weak takes fade out once 40 newer ones exist.
    expect(familyStatuses([...at(10), ...Array.from({ length: 40 }, (_, i) => obs('uOu', 90, days[i % 2]))]).uOu).toBe('clear');
  });

  it('reports every scored family and never liaison or elision', () => {
    const statuses = familyStatuses([]);
    expect(Object.keys(statuses).sort()).toEqual([...SCORED_FAMILIES].sort());
  });
});
