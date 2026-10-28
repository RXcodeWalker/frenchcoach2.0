import { describe, expect, it } from 'vitest';
import { segmentWord, startsWithVowelSound, wordVariants } from '../graphemes';
import fixture from './fixtures/azureFrPhonemeCounts.json';

function readings(word: string, context = {}): string[] {
  const segmented = segmentWord(word, context);
  if (!segmented) return [];
  return wordVariants(segmented).map((v) => v.phonemes.map((p) => p.ipa).join(''));
}

describe('segmentWord', () => {
  it.each([
    ['rouge', 'ʁuʒ'],
    ['tu', 'ty'],
    ['tout', 'tu'],
    ['vin', 'vɛ̃'],
    ['vent', 'vɑ̃'],
    ['bon', 'bɔ̃'],
    ['montagne', 'mɔ̃taɲ'],
    ['fille', 'fij'],
    ['travail', 'tʁavaj'],
    ['soleil', 'solɛj'],
    ['moi', 'mwa'],
    ['loin', 'lwɛ̃'],
    ['beaucoup', 'boku'],
    ['question', 'kɛstjɔ̃'],
    ['nation', 'nasjɔ̃'],
    ['manger', 'mɑ̃ʒe'],
    ['été', 'ete'],
    ['chien', 'ʃjɛ̃'],
    ['bonne', 'bon'],
    ["aujourd'hui", 'oʒuʁdɥi'],
  ])('reads %s as /%s/ (among its readings)', (word, expected) => {
    expect(readings(word)).toContain(expected);
  });

  it('makes a final -ent silent after ils/elles, and after a vowel', () => {
    expect(readings('parlent', { previous: 'ils' })).toEqual(['paʁl']);
    expect(readings('jouent')).toEqual(['ʒu']);
  });

  it('keeps both readings of an ambiguous -ent, so the aligner decides', () => {
    expect(readings('souvent')).toEqual(expect.arrayContaining(['suvɑ̃', 'suv']));
  });

  it('marks silent finals, elision and liaison as word-level tags with no phoneme', () => {
    const petit = segmentWord('petit')!;
    expect(petit.units[petit.units.length - 1]).toMatchObject({ text: 't', options: [{ ipa: [], wordTags: ['silentFinal'] }] });
    const ecole = segmentWord("l'école")!;
    expect(ecole.units[0]).toMatchObject({ text: "l'", options: [{ ipa: ['l'], wordTags: ['elision'] }] });
    const les = segmentWord('les', { next: 'enfants' })!;
    expect(les.units[les.units.length - 1].options.map((o) => o.ipa)).toEqual([[], ['z']]);
  });

  it('offsets point at the letters in the normalised word', () => {
    const seg = segmentWord('Enfants,')!;
    expect(seg.word).toBe('enfants');
    expect(seg.units.map((u) => seg.word.slice(u.start, u.end))).toEqual(seg.units.map((u) => u.text));
  });

  it('returns null for digits and loanwords', () => {
    expect(segmentWord('20')).toBeNull();
    expect(segmentWord('week-end')).toBeNull();
    expect(segmentWord('')).toBeNull();
  });
});

describe('startsWithVowelSound', () => {
  it('links into vowels and h muet, not h aspiré or oui/onze', () => {
    expect(startsWithVowelSound('enfants')).toBe(true);
    expect(startsWithVowelSound('hommes')).toBe(true);
    expect(startsWithVowelSound('haricots')).toBe(false);
    expect(startsWithVowelSound('onze')).toBe(false);
    expect(startsWithVowelSound('chats')).toBe(false);
  });
});

describe('agreement with real Azure fr-FR phoneme counts', () => {
  // Azure returns per-phoneme accuracy with empty phoneme names for fr-FR; the
  // Lab names phonemes by count-matched alignment, so this rate is how often a
  // word gives phoneme-level family evidence. Measured 0.939 on 2026-10-28.
  it('matches at least 90 % of the fixture readings', () => {
    let total = 0;
    let matched = 0;
    for (const [word, counts] of Object.entries(fixture.counts as Record<string, number[]>)) {
      const segmented = segmentWord(word);
      if (!segmented) continue;
      const lengths = new Set(wordVariants(segmented).map((v) => v.phonemes.length));
      for (const count of counts) {
        total += 1;
        if (lengths.has(count)) matched += 1;
      }
    }
    expect(total).toBeGreaterThan(400);
    expect(matched / total).toBeGreaterThanOrEqual(0.9);
  });
});
