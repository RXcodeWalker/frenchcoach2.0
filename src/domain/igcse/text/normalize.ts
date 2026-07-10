/**
 * Shared text normalization — sole comparison path for quote-grounding (S1/L3)
 * and question matching (S3/STT). Keeping one implementation means S3's transcript
 * annotation and L3's quote-verification guardrail agree on what "the same text" means.
 */

const APOSTROPHES = /[‘’ʼ`´]/g;
const DOUBLE_QUOTES = /[“”]/g;
const EDGE_PUNCT =
  /^[\s"'.,;:!?…\-–—()]+|[\s"'.,;:!?…\-–—()]+$/g;

/** Base normalization — transcript text; internal content preserved. */
export function normalizeForMatch(input: string): string {
  return input
    .normalize('NFC')
    .replace(APOSTROPHES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Descriptor equality + quote-boundary trimming. */
export function canonicalizeForMatch(input: string): string {
  return normalizeForMatch(input).replace(EDGE_PUNCT, '');
}
