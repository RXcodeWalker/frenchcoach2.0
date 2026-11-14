import type { NewsGlossaryEntry } from '../../data/news/types';

export interface Segment {
  text: string;
  gloss?: string;
}

/**
 * Splits `text` into plain runs and glossary words (case-insensitive, longest
 * phrase first, never overlapping), so a word can be tapped for its English.
 */
export function segmentWithGlossary(text: string, glossary: readonly NewsGlossaryEntry[]): Segment[] {
  const lower = text.toLowerCase();
  const hits: { start: number; end: number; gloss: string }[] = [];
  const entries = [...glossary].sort((a, b) => b.fr.length - a.fr.length);
  for (const g of entries) {
    const needle = g.fr.toLowerCase();
    let from = 0;
    while (needle && from <= lower.length) {
      const at = lower.indexOf(needle, from);
      if (at < 0) break;
      const end = at + needle.length;
      const wordEdge = (i: number) => i < 0 || i >= lower.length || !/[\p{L}\p{N}]/u.test(lower[i]);
      const free = hits.every(h => end <= h.start || at >= h.end);
      if (free && wordEdge(at - 1) && wordEdge(end)) {
        hits.push({ start: at, end, gloss: g.en });
        break;
      }
      from = at + 1;
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start > pos) out.push({ text: text.slice(pos, h.start) });
    out.push({ text: text.slice(h.start, h.end), gloss: h.gloss });
    pos = h.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
