/**
 * Whole-word matching for the Junior matcher. A deliberate copy of the small
 * word helpers in src/domain/learn/feedback/fixMatch.ts (`words`, `containsRun`,
 * `phraseHeard`): that module also imports the exam's sound-alike tables under
 * src/domain/igcse/, and ADR 0012 says Junior imports nothing from the scored
 * pipeline, not even transitively (junior/__tests__/isolation.test.ts).
 *
 * Only the accent-folded path is copied: Junior always folds accents
 * (« ete » = « été »). Pure.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lower-cased, accent-folded whole words: apostrophes and hyphens stay inside a word, edges and other punctuation go. */
export function words(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}'\-\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean);
}

/** `needle` appears in `haystack` as a contiguous run of whole words. */
export function containsRun(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/** `phrase` appears in `text` as whole words, ignoring case, accents and punctuation. */
export function phraseHeard(text: string, phrase: string): boolean {
  return containsRun(words(text), words(phrase));
}
