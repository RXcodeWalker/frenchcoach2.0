/**
 * Exam-mode pronunciation analysis — sound patterns (plan §2 report item 3,
 * fairness rule 5). Groups REPORTED words by their inferred category. A
 * pattern needs at least `patternMinDistinctWords` distinct words; it shows up
 * to `patternMaxExamples` of the candidate's own words. Patterns are always
 * labelled `inferred`: the category comes from spelling, not from a measured
 * phoneme (fr-FR Azure has no phoneme names).
 *
 * The copy describes a sound to practise. It never names a level, a mark or a
 * band, and never calls an accent wrong (`__tests__/patterns.test.ts` runs it
 * through the shared mark/band filter).
 */

import { FAIRNESS_CONFIG, normalizeWord } from './fairness';
import type { FairnessWordVerdict, SoundCategory, SoundPattern } from './types';

export const PATTERN_COPY: Record<SoundCategory, { label: string; explanation: string }> = {
  nasalVowel: {
    label: 'Nasal vowels',
    explanation:
      'Sounds like "on", "an" and "in" go through the nose, without a full n at the end. Saying a plain vowel instead can turn one word into another (bon / beau).',
  },
  vowelQuality: {
    label: 'Vowel pairs that change the word',
    explanation:
      'Some vowels are the only difference between two words — "tout" and "tu", "les" and "le". Keep the two sounds clearly apart.',
  },
  silentEnding: {
    label: 'Silent endings',
    explanation:
      'Many final letters are not pronounced ("ils parlent", "petit"). Sounding them can make the word sound like a different form.',
  },
  liaison: {
    label: 'Linking words',
    explanation:
      'Some words must link into the next one ("ils‿ont", "les‿amis"). Without the link, "ils ont" can sound like "ils sont".',
  },
};

/** Stable tie-break order when two patterns have the same number of words. */
const CATEGORY_ORDER: readonly SoundCategory[] = ['liaison', 'nasalVowel', 'vowelQuality', 'silentEnding'];

/** Patterns from reported verdicts, most distinct words first, at most `max`. */
export function buildPatterns(
  verdicts: readonly FairnessWordVerdict[],
  max: number = FAIRNESS_CONFIG.maxPatterns,
): SoundPattern[] {
  const byCategory = new Map<SoundCategory, string[]>();
  const seen = new Map<SoundCategory, Set<string>>();
  for (const v of verdicts) {
    if (!v.reported || v.category === null) continue;
    const key = normalizeWord(v.word);
    const keys = seen.get(v.category) ?? new Set<string>();
    if (keys.has(key)) continue;
    keys.add(key);
    seen.set(v.category, keys);
    byCategory.set(v.category, [...(byCategory.get(v.category) ?? []), v.word]);
  }

  return [...byCategory.entries()]
    .filter(([, words]) => words.length >= FAIRNESS_CONFIG.patternMinDistinctWords)
    .sort(([a, wa], [b, wb]) => wb.length - wa.length || CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
    .slice(0, max)
    .map(([category, words]) => ({
      category,
      ...PATTERN_COPY[category],
      examples: words.slice(0, FAIRNESS_CONFIG.patternMaxExamples),
      provenance: 'inferred' as const,
    }));
}
