/**
 * Underline the learner's own words in their answer bubble as the teacher gets
 * to each fix (Learn feedback Batch 6b). Pure.
 *
 * It locates each fix's quote in the transcript by quote search rather than via
 * the server's `transcriptAnnotations`: those cover only `issues[]` (never the
 * examiner voice's errors, which have no spans), and every quote shown here
 * already passed the grounding filters, so a quote search finds the same words
 * for both voices.
 *
 * A quote that cannot be found is simply not underlined; overlapping hits are
 * merged; the segments always concatenate back to the transcript exactly.
 */

export interface MarkedSegment {
  text: string;
  marked: boolean;
}

const APOSTROPHES = /[‘’´`]/g;

/** Same length as the input, so an index in the folded text is an index in the original. */
function fold(text: string): string {
  return text.replace(APOSTROPHES, "'").toLowerCase();
}

export function markQuotes(transcript: string, quotes: readonly string[]): MarkedSegment[] {
  if (!transcript) return [];
  const haystack = fold(transcript);
  // Folding must not shift indices (it never does for French); if it somehow did, mark nothing.
  if (haystack.length !== transcript.length) return [{ text: transcript, marked: false }];

  const spans: Array<[number, number]> = [];
  for (const quote of quotes) {
    const needle = fold(quote.trim());
    if (!needle) continue;
    const at = haystack.indexOf(needle);
    if (at !== -1) spans.push([at, at + needle.length]);
  }
  if (spans.length === 0) return [{ text: transcript, marked: false }];

  spans.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  const segments: MarkedSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: transcript.slice(cursor, start), marked: false });
    segments.push({ text: transcript.slice(start, end), marked: true });
    cursor = end;
  }
  if (cursor < transcript.length) segments.push({ text: transcript.slice(cursor), marked: false });
  return segments;
}
