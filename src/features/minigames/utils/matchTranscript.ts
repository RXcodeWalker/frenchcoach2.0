import { normalizeFrench } from './normalizeFrench';
import { diceCoefficient } from './diceCoefficient';

export type TranscriptMatchMode = 'substring' | 'fuzzy';

export interface TranscriptMatchOptions {
  mode: TranscriptMatchMode;
  diceThreshold?: number;
  wordDiceThreshold?: number;
}

const DEFAULT_DICE_THRESHOLD = 0.8;
const DEFAULT_WORD_DICE_THRESHOLD = 0.85;

/**
 * Returns the new portion of a transcript since the last check.
 * Mirrors SpeedSpeaking / SpeakingArena delta slicing.
 */
export function getRelevantTranscript(
  fullTranscript: string,
  lastCheckedTranscript: string
): string {
  const normalizedFull = normalizeFrench(fullTranscript);
  const normalizedLast = normalizeFrench(lastCheckedTranscript);
  return normalizedFull.replace(normalizedLast, '');
}

function matchFuzzy(
  relevantTranscript: string,
  phrase: string,
  diceThreshold: number,
  wordDiceThreshold: number
): boolean {
  if (relevantTranscript.includes(phrase)) return true;

  if (diceCoefficient(relevantTranscript, phrase) > diceThreshold) return true;

  const words = phrase.split(' ');
  const transcriptWords = relevantTranscript.split(' ');
  return words.every((word) => {
    if (word.length <= 2) return true;
    return transcriptWords.some(
      (tWord) => diceCoefficient(tWord, word) > wordDiceThreshold
    );
  });
}

export function matchTranscript(
  transcript: string,
  acceptable: string | string[],
  options: TranscriptMatchOptions = { mode: 'substring' }
): boolean {
  const relevantTranscript = getRelevantTranscript(transcript, '');
  const phrases = Array.isArray(acceptable)
    ? acceptable.map(normalizeFrench)
    : [normalizeFrench(acceptable)];

  const diceThreshold = options.diceThreshold ?? DEFAULT_DICE_THRESHOLD;
  const wordDiceThreshold = options.wordDiceThreshold ?? DEFAULT_WORD_DICE_THRESHOLD;

  return phrases.some((phrase) => {
    if (options.mode === 'substring') {
      return relevantTranscript.includes(phrase);
    }
    return matchFuzzy(relevantTranscript, phrase, diceThreshold, wordDiceThreshold);
  });
}

/**
 * Match against the delta since lastCheckedTranscript (speech game flow).
 */
export function matchTranscriptDelta(
  fullTranscript: string,
  lastCheckedTranscript: string,
  acceptable: string | string[],
  options: TranscriptMatchOptions = { mode: 'substring' }
): boolean {
  const relevantTranscript = getRelevantTranscript(fullTranscript, lastCheckedTranscript);
  const phrases = Array.isArray(acceptable)
    ? acceptable.map(normalizeFrench)
    : [normalizeFrench(acceptable)];

  const diceThreshold = options.diceThreshold ?? DEFAULT_DICE_THRESHOLD;
  const wordDiceThreshold = options.wordDiceThreshold ?? DEFAULT_WORD_DICE_THRESHOLD;

  return phrases.some((phrase) => {
    if (options.mode === 'substring') {
      return relevantTranscript.includes(phrase);
    }
    return matchFuzzy(relevantTranscript, phrase, diceThreshold, wordDiceThreshold);
  });
}
