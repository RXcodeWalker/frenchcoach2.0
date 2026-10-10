/**
 * The ONE text normaliser for the Learn transcript benchmark. The refine-path
 * guard (backend) must tokenise identically, so WER here measures words, not
 * commas or apostrophe styles.
 *
 * Rules: NFC, lowercase, curly apostrophe → ', split on apostrophes and
 * hyphens, strip punctuation. Accents are KEPT on purpose (a/à, ou/où, sur/sûr
 * are different words) — do not reuse fillers.ts's accent-stripping.
 */

export function normaliseTokens(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/['-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
