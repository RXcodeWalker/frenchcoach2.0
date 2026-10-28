/**
 * Pronunciation Lab — word states (pronunciation-lab plan §5.1). Pure.
 *
 * One scripted Azure result → one state per word of the target sentence:
 * clear | almost | practise | missed | extra | unknown.
 *
 * **Scripted mode only.** A freeform result (Learn's open answers, where the
 * "reference" is Whisper's transcript of the same audio) cannot see the word
 * the learner meant — the exam calibration caught 0 of 9 deliberate swaps —
 * so `buildLabTake` refuses it and every word is `unknown`. So does a result
 * that isn't Azure's, or one Azure could not assess. No call site can put
 * colours back on a free answer through this module.
 *
 * Fairness guard (plan §5.1): a word is never "Practise" when every one of its
 * phonemes is at least Almost — a low word score built from uniformly
 * mid-range phonemes is where accent lives; it shows as Almost instead.
 *
 * `accuracy` is kept on each item for ordering (focus words) only; the Lab
 * never displays a number other than "N of M words clear" (owner D5).
 */

import { normalizeWord } from '../../examPronunciation/fairness';
import type { PronunciationAssessment, PronunciationWordResult } from '../types';
import { LAB_THRESHOLDS } from './thresholds';
import { tokenizeSentence, type SentenceToken } from './textFeatures';
import type { LabWordState } from './types';

export type LabRefusal = 'freeform' | 'not-azure' | 'could-not-assess';

/** The state of one scripted Azure word, before it is placed in the sentence. */
export function wordState(word: PronunciationWordResult): LabWordState {
  const t = LAB_THRESHOLDS.word;
  if (word.errorType === 'extra') return 'extra';
  if (word.errorType === 'skipped') return 'missed';
  if (word.nearChunkBoundary) return 'unknown';
  const accuracy = word.accuracyScore;
  if (accuracy === null || !Number.isFinite(accuracy)) return 'unknown';
  const mispronounced = word.errorType === 'mispronounced';
  if (accuracy >= t.clearMin && !mispronounced) return 'clear';
  if (accuracy >= t.almostMin && !mispronounced) return 'almost';
  const phonemes = word.phonemes ?? [];
  const allPhonemesAlmost =
    phonemes.length > 0 && phonemes.every((p) => p.accuracyScore !== null && p.accuracyScore >= t.almostMin);
  return allPhonemesAlmost ? 'almost' : 'practise';
}

/** Why a result cannot give word states, or null when it can. */
export function labRefusal(assessment: PronunciationAssessment): LabRefusal | null {
  if (assessment.mode !== 'scripted') return 'freeform';
  if (assessment.provider !== 'azure') return 'not-azure';
  if (assessment.couldNotAssess) return 'could-not-assess';
  return null;
}

export interface LabWordItem {
  kind: 'word';
  tokenIndex: number;
  /** As written in the target sentence. */
  text: string;
  state: LabWordState;
  /** Internal ordering signal; never shown. Null for unknown/missed. */
  accuracy: number | null;
  /** The Azure word(s) that scored this token (several when Azure split it). */
  source: PronunciationWordResult[];
}

export interface LabExtraItem {
  kind: 'extra';
  /** The token this extra word follows; -1 = before the first word. */
  afterTokenIndex: number;
  text: string;
}

export type LabSentenceItem = LabWordItem | LabExtraItem;

export interface LabTakeCounts {
  clear: number;
  almost: number;
  practise: number;
  missed: number;
  unknown: number;
  extra: number;
  /** Words in the target sentence (extras not included). */
  total: number;
}

export interface LabTake {
  targetText: string;
  refused: LabRefusal | null;
  /** One `word` item per target token in order, `extra` items between them. */
  items: LabSentenceItem[];
  counts: LabTakeCounts;
}

const STATE_RANK: Record<LabWordState, number> = { clear: 4, almost: 3, practise: 2, missed: 1, unknown: 0, extra: 0 };

/** The worse of two states (for a token Azure scored as several words). */
function worse(a: LabWordState, b: LabWordState): LabWordState {
  if (a === 'unknown' || b === 'unknown') return 'unknown';
  return STATE_RANK[a] <= STATE_RANK[b] ? a : b;
}

/** Comparison key: hyphens and apostrophes don't decide whether two spellings are one word. */
function key(word: string): string {
  return normalizeWord(word).replace(/['-]/g, '');
}

/** How far ahead an Azure word may match a target token (Azure occasionally drops or splits one). */
const LOOKAHEAD = 3;
/** At most this many Azure words may join up to one target token ("peut" + "être"). */
const MAX_JOIN = 3;

function emptyCounts(total: number): LabTakeCounts {
  return { clear: 0, almost: 0, practise: 0, missed: 0, unknown: 0, extra: 0, total };
}

function countItems(items: readonly LabSentenceItem[], total: number): LabTakeCounts {
  const counts = emptyCounts(total);
  for (const item of items) {
    if (item.kind === 'extra') counts.extra += 1;
    else counts[item.state as Exclude<LabWordState, 'extra'>] += 1;
  }
  return counts;
}

/**
 * Places a scripted result on the target sentence: each target word gets the
 * state of the Azure word(s) matching it in order; a word nothing matched is
 * `unknown`; Azure's extra words sit between target words, never on one.
 */
export function buildLabTake(targetText: string, assessment: PronunciationAssessment): LabTake {
  const tokens = tokenizeSentence(targetText);
  const refused = labRefusal(assessment);
  const unknownItem = (token: SentenceToken, tokenIndex: number): LabWordItem => ({
    kind: 'word', tokenIndex, text: token.text, state: 'unknown', accuracy: null, source: [],
  });

  if (refused) {
    const items = tokens.map(unknownItem);
    return { targetText, refused, items, counts: countItems(items, tokens.length) };
  }

  const wordItems: LabWordItem[] = tokens.map(unknownItem);
  const extras: LabExtraItem[] = [];
  const words = assessment.words;
  let nextToken = 0;
  let lastMatched = -1;
  let w = 0;
  while (w < words.length) {
    const word = words[w];
    if (word.errorType === 'extra') {
      extras.push({ kind: 'extra', afterTokenIndex: lastMatched, text: word.word });
      w += 1;
      continue;
    }
    let matched = false;
    for (let t = nextToken; t < Math.min(tokens.length, nextToken + LOOKAHEAD + 1) && !matched; t++) {
      const target = key(tokens[t].text);
      let joined = '';
      const parts: PronunciationWordResult[] = [];
      for (let j = w; j < Math.min(words.length, w + MAX_JOIN); j++) {
        if (words[j].errorType === 'extra') break;
        joined += key(words[j].word);
        parts.push(words[j]);
        if (joined === target) {
          const state = parts.map(wordState).reduce(worse);
          const scored = parts.map((p) => p.accuracyScore).filter((a): a is number => a !== null && Number.isFinite(a));
          wordItems[t] = {
            kind: 'word',
            tokenIndex: t,
            text: tokens[t].text,
            state,
            accuracy: state === 'unknown' || state === 'missed' || scored.length === 0 ? null : Math.min(...scored),
            source: parts,
          };
          nextToken = t + 1;
          lastMatched = t;
          w = j + 1;
          matched = true;
          break;
        }
        if (!target.startsWith(joined)) break;
      }
    }
    if (!matched) w += 1; // an Azure word with no target match is dropped, not guessed onto a neighbour
  }

  const items: LabSentenceItem[] = [];
  for (const extra of extras.filter((e) => e.afterTokenIndex === -1)) items.push(extra);
  for (const item of wordItems) {
    items.push(item);
    for (const extra of extras.filter((e) => e.afterTokenIndex === item.tokenIndex)) items.push(extra);
  }
  return { targetText, refused: null, items, counts: countItems(items, tokens.length) };
}

/** The word items of a take, in sentence order. */
export function takeWords(take: LabTake): LabWordItem[] {
  return take.items.filter((i): i is LabWordItem => i.kind === 'word');
}

export type DrillVerdict = 'clear' | 'almost' | 'tryAgain' | 'unknown';

/**
 * A focus-word drill (plan §3.2 step 4): the learner says the word (or a
 * two-word liaison group) alone. The worst word decides; "Try again" is the
 * only negative, and it never says "wrong".
 */
export function drillVerdict(take: LabTake): DrillVerdict {
  const words = takeWords(take);
  if (take.refused || words.length === 0) return 'unknown';
  const state = words.map((w) => w.state).reduce(worse);
  if (state === 'clear') return 'clear';
  if (state === 'almost') return 'almost';
  if (state === 'practise' || state === 'missed') return 'tryAgain';
  return 'unknown';
}
