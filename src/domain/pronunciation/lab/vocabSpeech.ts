/**
 * Pronunciation Lab — saying a key-vocabulary entry aloud. Pure.
 *
 * A question's key vocabulary is glossary text ("fascinant(e)", "cadet/cadette",
 * "faire du sport", "je trouve que..."). To play one, the first alternative is
 * taken, the bracketed endings and trailing dots are dropped, and each word is
 * written as the Lab's recorded lexicon writes it (`normalizeWord`) — so a
 * single word finds its recording, exactly as `scripts/tts/collectLines.ts`'s
 * `vocabWords` catalogues it. A phrase is not in the catalogue and is read by
 * the browser's French voice.
 */

import { respellWord } from './respell';
import { tokenizeSentence } from './textFeatures';

/** What to say for a glossary entry; null when nothing speakable is left. */
export function vocabSpoken(fr: string): string | null {
  const first = fr.replace(/\([^)]*\)/g, '').split('/')[0] ?? '';
  const words = tokenizeSentence(first).map((t) => t.norm);
  return words.length > 0 ? words.join(' ') : null;
}

/** "boh(n)"-style cue for a one-word entry; null for a phrase or a word that can't be cued honestly. */
export function vocabCue(fr: string): string | null {
  const spoken = vocabSpoken(fr);
  return spoken && !spoken.includes(' ') ? respellWord(spoken) : null;
}
