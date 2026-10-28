/**
 * Pronunciation Lab — "watch out for" (pronunciation-lab plan §3.1 item 3,
 * §3.2 step 1). Pure.
 *
 * Rules on the TARGET SENTENCE's spelling, never a verdict on the learner:
 * which sound features in this sentence are worth listening for. A feature is
 * claimed only when every reading of the word in `graphemes.ts` has it, so an
 * ambiguous spelling (the -ent of "souvent" vs "ils parlent") claims nothing.
 */

import { normalizeWord } from '../../examPronunciation/fairness';
import { segmentWord, type GraphemeUnit } from './graphemes';
import { familiesForPhoneme } from './soundFamilies';
import { LAB_THRESHOLDS } from './thresholds';
import type { SoundFamilyId } from './types';

export interface SentenceToken {
  /** As written in the sentence, punctuation included. */
  text: string;
  /** Offsets in the (NFC) sentence. */
  start: number;
  end: number;
  /** `normalizeWord(text)`. */
  norm: string;
  /** Where `norm` begins inside `text` (leading punctuation skipped). */
  normOffset: number;
}

/** The sentence's words in order; tokens that are only punctuation (« — ?) are left out. */
export function tokenizeSentence(sentence: string): SentenceToken[] {
  const text = sentence.normalize('NFC');
  const tokens: SentenceToken[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const raw = match[0];
    const norm = normalizeWord(raw);
    if (!norm) continue;
    const lead = raw.search(/[\p{L}\p{N}]/u);
    tokens.push({ text: raw, start: match.index, end: match.index + raw.length, norm, normOffset: Math.max(0, lead) });
  }
  return tokens;
}

/** A character range inside one token's `text`, to underline. */
export interface FeatureHighlight {
  tokenIndex: number;
  start: number;
  end: number;
}

export interface SoundFeature {
  family: SoundFamilyId;
  /** First token of the feature. */
  tokenIndex: number;
  /** Last token (the next word for a liaison, else the same token). */
  endTokenIndex: number;
  highlights: FeatureHighlight[];
  /** What a chip plays: the word, or the two-word group for a liaison. */
  playText: string;
}

const VISIBLE_ACCENT = /[éèêë]/;
const U_SPELLING = /^(u|û|ou|où|oû)$/;

function stableUnitFamilies(unit: GraphemeUnit): SoundFamilyId[] {
  const perOption = unit.options.map((o) => [
    ...new Set<SoundFamilyId>([...o.ipa.flatMap((p) => familiesForPhoneme(p, o.phonemeTags)), ...(o.wordTags ?? [])]),
  ]);
  return perOption[0].filter((f) => perOption.every((families) => families.includes(f)));
}

/** Text rules a unit must also pass, so a chip points at something a learner can see in the spelling. */
function visible(family: SoundFamilyId, unit: GraphemeUnit, word: string): boolean {
  // A long irregular word is one unit: underlining all of it would point at nothing.
  if (unit.lexical && unit.text.length > 4) return false;
  switch (family) {
    case 'eAccents': return VISIBLE_ACCENT.test(unit.text);
    case 'uOu': return U_SPELLING.test(unit.text);
    case 'silentFinal': return word.replace(/['-]/g, '').length >= 3 && unit.text.length > 0;
    default: return unit.text.length > 0 || family === 'liaison';
  }
}

/** Every sound feature in the sentence, in reading order. */
export function soundFeatures(sentence: string): SoundFeature[] {
  const tokens = tokenizeSentence(sentence);
  const features: SoundFeature[] = [];
  tokens.forEach((token, tokenIndex) => {
    const segmented = segmentWord(token.text, { previous: tokens[tokenIndex - 1]?.text ?? null, next: tokens[tokenIndex + 1]?.text ?? null });
    if (!segmented) return;
    for (const unit of segmented.units) {
      for (const family of stableUnitFamilies(unit)) {
        if (!visible(family, unit, segmented.word)) continue;
        if (family === 'liaison') {
          const nextToken = tokens[tokenIndex + 1];
          features.push({
            family,
            tokenIndex,
            endTokenIndex: tokenIndex + 1,
            highlights: [
              { tokenIndex, start: token.normOffset + token.norm.length - 1, end: token.normOffset + token.norm.length },
              { tokenIndex: tokenIndex + 1, start: nextToken.normOffset, end: nextToken.normOffset + 1 },
            ],
            playText: `${token.norm} ${nextToken.norm}`,
          });
          continue;
        }
        const highlight = { tokenIndex, start: token.normOffset + unit.start, end: token.normOffset + unit.end };
        const same = features.find((f) => f.family === family && f.tokenIndex === tokenIndex && f.endTokenIndex === tokenIndex);
        if (same) {
          same.highlights.push(highlight);
          continue;
        }
        features.push({ family, tokenIndex, endTokenIndex: tokenIndex, highlights: [highlight], playText: token.norm });
      }
    }
  });
  return features;
}

/**
 * Which features "watch out for" names, in priority order. Families in one
 * group are one item to a learner ("nasal vowels"), so a sentence gets at most
 * one of each group.
 */
const WATCH_GROUPS: ReadonlyArray<readonly SoundFamilyId[]> = [
  ['liaison'],
  ['nasalAn', 'nasalOn', 'nasalIn'],
  ['uOu'],
  ['silentFinal'],
  ['frenchR'],
  ['eAccents'],
  ['elision'],
  ['eu'],
  ['oi'],
  ['gnIll'],
];

/**
 * Up to `max` features worth listening for in `sentence`: one per group, the
 * first occurrence of each, preferring a word no chip has used yet. Returned
 * in reading order.
 */
export function watchOutFor(sentence: string, max: number = LAB_THRESHOLDS.watchOut.maxFeatures): SoundFeature[] {
  const all = soundFeatures(sentence);
  const chosen: SoundFeature[] = [];
  const usedTokens = new Set<number>();
  for (const pass of ['fresh', 'any'] as const) {
    for (const group of WATCH_GROUPS) {
      if (chosen.length >= max) break;
      if (chosen.some((f) => group.includes(f.family))) continue;
      const candidate = all.find(
        (f) => group.includes(f.family) && (pass === 'any' || (!usedTokens.has(f.tokenIndex) && !usedTokens.has(f.endTokenIndex))),
      );
      if (!candidate) continue;
      chosen.push(candidate);
      usedTokens.add(candidate.tokenIndex);
      usedTokens.add(candidate.endTokenIndex);
    }
  }
  return chosen.sort((a, b) => a.tokenIndex - b.tokenIndex);
}
