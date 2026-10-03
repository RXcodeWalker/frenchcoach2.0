/**
 * Mark/band filter for examiner-style feedback (Phase 3 plan, "Shared
 * invariants"). Feedback must never read as a grade prediction, so a claim
 * that carries mark, band, grade or score language is DROPPED — never
 * rewritten. Scans claim text only, never the candidate's quote or the
 * correction (both are the candidate's / reference French, not the model's
 * prose).
 *
 * Plain "good / weak / poor / very good" in prose is deliberately kept: it is
 * ordinary English, not a band reference. The word `level` is not matched
 * ("at this level of detail"), and capitalised "Extended"/"Core" alone is not
 * matched — only the invented tier labels are.
 */

const QUESTION_MARK = /\bquestion marks?\b/gi;

const WORD_PATTERNS: readonly RegExp[] = [
  /\bbands?\b/i,
  /\bgrades?\b/i,
  /\bmarks?\b/i, // "question mark" is stripped first
  /\bscores?\b/i,
  /\bsatisfactory\b/i,
  // Invented tier labels (the retired backend IGCSE labels and their variants).
  /\bcore\s*[-–—]\s*secure\b/i,
  /\bextended\s*[-–—]\s*(?:mid|high)\b/i,
  /\bfoundation\s*[-–—]\s*developing\b/i,
  /\b(?:foundation|core|extended|higher)\s+(?:tier|band)\b/i,
  // `N/N`, "out of N", French "sur N".
  /\b\d+\s*\/\s*\d+\b/,
  /\bout of \d+\b/i,
  /\bsur\s+\d+\b/i,
  // A digit beside mark / French `note(s)` ("note 14", "une note de 12").
  /\d\s*(?:marks?|notes?)\b/i,
  /\b(?:marks?|notes?)\s*(?:[:=]|de)?\s*\d/i,
  // Letter grades.
  /\bA\*/,
  /\bgrade\s+[A-G]\b/i,
];

const RANGE = /(\d+)\s*[–—-]\s*(\d+)(\s*[a-z]+)?/gi;
const COUNT_UNITS = /^\s*(?:words?|sentences?|minutes?|mins?|seconds?|secs?)\b/i;
const MAX_BAND_NUMBER = 15;

function hasBandRange(text: string): boolean {
  for (const m of text.matchAll(RANGE)) {
    if (Number(m[1]) > MAX_BAND_NUMBER || Number(m[2]) > MAX_BAND_NUMBER) continue;
    if (m[3] && COUNT_UNITS.test(m[3])) continue;
    return true;
  }
  return false;
}

/** True when the claim text reads as a mark, band, grade or score and must be dropped. */
export function claimMentionsMarkOrBand(claim: string): boolean {
  const text = claim.normalize('NFC').replace(QUESTION_MARK, ' ');
  return WORD_PATTERNS.some((p) => p.test(text)) || hasBandRange(text);
}
