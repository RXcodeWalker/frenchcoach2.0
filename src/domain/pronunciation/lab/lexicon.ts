/**
 * Pronunciation Lab — the native-audio lexicon (pronunciation-lab plan §4.2,
 * Stage 4). Pure.
 *
 * Which strings must be recorded so ▶ Native works word by word. The Lab asks
 * `playNative` for a word as `wordPlayTexts(sentence, i)` gives it: the
 * normalised word (`normalizeWord`: lowercase, edge punctuation off, an inner
 * apostrophe such as l'enfant kept) and, for a word inside a liaison, the
 * two-word group first. `voiceKey` hashes case and punctuation, so the
 * lexicon must hold exactly those strings, and `lexiconTexts` derives them
 * with the same tokenizer and the same liaison rule rather than a copy of
 * either (the catalogue coverage test pins the equality with `wordPlayTexts`).
 *
 * Words in an AI-corrected sentence are then mostly covered even though the
 * sentence itself has no recording (that is Stage 4b's cached-TTS endpoint).
 */

import { minimalPairTexts } from './minimalPairs';
import { soundFeatures, tokenizeSentence } from './textFeatures';
import { SOUND_TIPS } from './tips';

/**
 * Whether a recording of this word is worth keeping: letters (with the
 * apostrophes and hyphens French words carry) or plain digits. Not recorded,
 * so ▶ Native falls back to the browser voice: a token that mixes letters and
 * digits (co2, 3d: Azure's reading is a guess), one with stray symbols, and the
 * bare letter y (Azure says the letter's name, "i grec", not the word).
 * Recordings never change once uploaded, so a doubtful one is better absent.
 */
export function isRecordableWord(text: string): boolean {
  if (text === 'y') return false;
  const words = text.split(' ');
  return words.every((w) => /^(\p{L}[\p{L}'-]*|\p{N}+)$/u.test(w));
}

/**
 * Every word, and every liaison group, that `wordPlayTexts` or a "watch out
 * for" chip can ask for in these sentences and that `isRecordableWord` allows.
 * Deduplicated, first-seen order.
 */
export function lexiconTexts(sentences: Iterable<string>): string[] {
  const texts = new Set<string>();
  for (const sentence of sentences) {
    for (const token of tokenizeSentence(sentence)) texts.add(token.norm);
    for (const feature of soundFeatures(sentence)) {
      if (feature.family === 'liaison') texts.add(feature.playText);
    }
  }
  return [...texts].filter(isRecordableWord);
}

/**
 * The sound guide's own strings (plan §3.3): every example word or group, each
 * minimal pair a guide shows, and every ear-training word. Written as authored.
 * Then the words inside those groups (Stage 5): "Say it" on a liaison example
 * such as "vous avez" opens the Lab on it, whose word taps play "vous" and
 * "avez" on their own.
 */
export function guideTexts(): string[] {
  const texts = new Set<string>();
  for (const tip of Object.values(SOUND_TIPS)) {
    for (const example of tip.examples) texts.add(example);
    for (const word of tip.minimalPair ?? []) texts.add(word);
  }
  for (const text of minimalPairTexts()) texts.add(text);
  for (const word of lexiconTexts([...texts])) texts.add(word);
  return [...texts];
}
