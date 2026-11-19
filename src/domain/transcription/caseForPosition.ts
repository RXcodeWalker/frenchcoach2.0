import { matchCase } from '../igcse/stt/homophones/text';

/**
 * A re-said word takes its capital from where it sits, not from the
 * recogniser: Whisper capitalises a word heard on its own (« Le »), but mid-
 * sentence it is « le ». At the start of a sentence it gets a capital. A word
 * the transcript already capitalised mid-sentence (a name: « Paris ») keeps
 * whatever the student's take says.
 */
export function caseForPosition(original: string, replacement: string, sentenceStart: boolean): string {
  if (!replacement) return replacement;
  const first = replacement.charAt(0);
  if (sentenceStart) return first.toUpperCase() + replacement.slice(1);
  const originalFirst = original.charAt(0);
  const originalLower = originalFirst !== '' && originalFirst === originalFirst.toLowerCase();
  if (originalLower) return first.toLowerCase() + replacement.slice(1);
  return matchCase(original, replacement);
}
