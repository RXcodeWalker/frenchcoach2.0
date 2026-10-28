/**
 * Pronunciation Lab — the 12 sound families (pronunciation-lab plan §5.2). Pure.
 *
 *  - `IPA_TO_FAMILY`: the static phoneme → family table.
 *  - `wordFamilyObservations`: which families one scripted Azure word gives
 *    evidence for, and how well each was said.
 *  - `familyStatuses`: "Your sounds" — Clear / Getting there / Needs work /
 *    Not enough data yet, from Lab takes only.
 *
 * fr-FR Azure returns each phoneme's accuracy but not its name (see
 * `graphemes.ts`), so phonemes are named by lining the target word's expected
 * phonemes up with Azure's list. A phoneme is attributed to a family only when
 * the phoneme counts match exactly and every count-matching reading of the
 * word agrees on that position's family. A word that can't be lined up still
 * counts once, at word level, if it contains exactly one scored family.
 * If Azure ever does name its phonemes, the names are used directly.
 *
 * Liaison and elision are text features: Azure doesn't score them, so they
 * never produce an observation and never appear in "Your sounds".
 */

import type { PronunciationWordResult } from '../types';
import { segmentWord, wordVariants, type WordContext } from './graphemes';
import { LAB_THRESHOLDS } from './thresholds';
import type { SoundFamilyId } from './types';

/** Plan §5.2 order; also the display order of "Your sounds" and the guides. */
export const SOUND_FAMILIES: readonly SoundFamilyId[] = [
  'frenchR', 'uOu', 'nasalAn', 'nasalOn', 'nasalIn', 'eAccents', 'eu', 'silentFinal', 'liaison', 'elision', 'gnIll', 'oi',
];

export type ScoredFamilyId = Exclude<SoundFamilyId, 'liaison' | 'elision'>;

/** Families Azure can give evidence for; liaison and elision are text-only. */
export const SCORED_FAMILIES: readonly ScoredFamilyId[] = [
  'frenchR', 'uOu', 'nasalAn', 'nasalOn', 'nasalIn', 'eAccents', 'eu', 'silentFinal', 'gnIll', 'oi',
];

/**
 * Phoneme (IPA, NFC) → family. Families that no single phoneme identifies —
 * OI/OIN (/w/ + a vowel), the /j/ of ILL, silent finals — come from the
 * spelling units in `graphemes.ts` instead.
 */
export const IPA_TO_FAMILY: Readonly<Record<string, SoundFamilyId>> = {
  'ʁ': 'frenchR',
  'r': 'frenchR',
  'y': 'uOu',
  'u': 'uOu',
  'ɑ̃': 'nasalAn',
  'ɔ̃': 'nasalOn',
  'ɛ̃': 'nasalIn',
  'œ̃': 'nasalIn',
  'e': 'eAccents',
  'ɛ': 'eAccents',
  'ø': 'eu',
  'œ': 'eu',
  'ɲ': 'gnIll',
};

export function familiesForPhoneme(ipa: string, extra: readonly SoundFamilyId[] = []): SoundFamilyId[] {
  const out = new Set<SoundFamilyId>(extra);
  const fromTable = IPA_TO_FAMILY[ipa.normalize('NFC')];
  if (fromTable) out.add(fromTable);
  return [...out];
}

export interface FamilyObservation {
  family: ScoredFamilyId;
  /** Azure accuracy, 0–100. Internal: never displayed as a number. */
  accuracy: number;
  /** 'phoneme' when a lined-up phoneme carried it, 'word' when it is the word's own accuracy. */
  basis: 'phoneme' | 'word';
}

export interface WordFamilyEvidence {
  /** True when Azure's phonemes were lined up with the expected ones. */
  aligned: boolean;
  observations: FamilyObservation[];
}

const NO_EVIDENCE: WordFamilyEvidence = { aligned: false, observations: [] };

function intersect(sets: ReadonlyArray<readonly SoundFamilyId[]>): SoundFamilyId[] {
  if (sets.length === 0) return [];
  return sets[0].filter((f) => sets.every((s) => s.includes(f)));
}

/** Families present in every reading of the word, phoneme-level and word-level together. */
export function stableWordFamilies(word: string, context: WordContext = {}): SoundFamilyId[] {
  const segmented = segmentWord(word, context);
  if (!segmented) return [];
  const variants = wordVariants(segmented);
  return intersect(
    variants.map((v) => [
      ...new Set<SoundFamilyId>([
        ...v.phonemes.flatMap((p) => familiesForPhoneme(p.ipa, p.tags)),
        ...v.wordTags.map((t) => t.family),
      ]),
    ]),
  );
}

const isScored = (f: SoundFamilyId): f is ScoredFamilyId => (SCORED_FAMILIES as readonly SoundFamilyId[]).includes(f);

/**
 * The family evidence one scripted word gives. Nothing for a word Azure did
 * not score (no accuracy, skipped, extra, near a chunk seam).
 */
export function wordFamilyObservations(word: PronunciationWordResult, context: WordContext = {}): WordFamilyEvidence {
  if (word.accuracyScore === null || word.errorType === 'skipped' || word.errorType === 'extra' || word.nearChunkBoundary) {
    return NO_EVIDENCE;
  }
  const wordAccuracy = word.accuracyScore;
  const phonemes = word.phonemes ?? [];
  const segmented = segmentWord(word.word, context);
  const variants = segmented ? wordVariants(segmented) : [];

  // Azure named its phonemes: use the names.
  if (phonemes.length > 0 && phonemes.every((p) => p.phoneme.trim() !== '')) {
    const observations: FamilyObservation[] = [];
    for (const p of phonemes) {
      if (p.accuracyScore === null) continue;
      for (const family of familiesForPhoneme(p.phoneme)) {
        if (isScored(family)) observations.push({ family, accuracy: p.accuracyScore, basis: 'phoneme' });
      }
    }
    const silent = intersect(variants.map((v) => v.wordTags.map((t) => t.family)));
    if (silent.includes('silentFinal')) observations.push({ family: 'silentFinal', accuracy: wordAccuracy, basis: 'word' });
    return { aligned: true, observations };
  }

  if (!segmented) return NO_EVIDENCE;
  const matching = variants.filter((v) => v.phonemes.length === phonemes.length && phonemes.length > 0);

  if (matching.length > 0) {
    const observations: FamilyObservation[] = [];
    phonemes.forEach((p, position) => {
      if (p.accuracyScore === null) return;
      const families = intersect(matching.map((v) => familiesForPhoneme(v.phonemes[position].ipa, v.phonemes[position].tags)));
      for (const family of families) {
        if (isScored(family)) observations.push({ family, accuracy: p.accuracyScore, basis: 'phoneme' });
      }
    });
    const wordLevel = intersect(matching.map((v) => v.wordTags.map((t) => t.family)));
    for (const family of new Set(wordLevel)) {
      if (isScored(family)) observations.push({ family, accuracy: wordAccuracy, basis: 'word' });
    }
    return { aligned: true, observations };
  }

  // Not lined up: count the word once, only if exactly one scored family is in it.
  const scored = stableWordFamilies(word.word, context).filter(isScored);
  if (scored.length === 1) return { aligned: false, observations: [{ family: scored[0], accuracy: wordAccuracy, basis: 'word' }] };
  return NO_EVIDENCE;
}

export type FamilyStatus = 'clear' | 'gettingThere' | 'needsWork' | 'notEnoughData';

export interface DatedObservation extends FamilyObservation {
  /** The take's local calendar day, YYYY-MM-DD. */
  day: string;
}

/**
 * "Your sounds" (plan §3.3, §5.2): a family leaves "Not enough data yet" only
 * with ≥ `minObservations` observations on ≥ `minDays` different days; then
 * the mean of the most recent `recentObservations` decides. `observations`
 * must be oldest first.
 */
export function familyStatuses(observations: readonly DatedObservation[]): Record<ScoredFamilyId, FamilyStatus> {
  const t = LAB_THRESHOLDS.family;
  const out = {} as Record<ScoredFamilyId, FamilyStatus>;
  for (const family of SCORED_FAMILIES) {
    const mine = observations.filter((o) => o.family === family);
    const days = new Set(mine.map((o) => o.day));
    if (mine.length < t.minObservations || days.size < t.minDays) {
      out[family] = 'notEnoughData';
      continue;
    }
    const recent = mine.slice(-t.recentObservations);
    const mean = recent.reduce((sum, o) => sum + o.accuracy, 0) / recent.length;
    out[family] = mean >= t.clearMin ? 'clear' : mean >= t.gettingThereMin ? 'gettingThere' : 'needsWork';
  }
  return out;
}
