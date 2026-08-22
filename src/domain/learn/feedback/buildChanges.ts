/**
 * Deterministic word-level diff for `changes[]` (docs Stage 3).
 *
 * "`changes[]` — structurally deterministic, and unambiguously targeted. The
 * diff itself is computed client-side from the canonical transcript and
 * improved_answer (a standard word-level LCS diff). The LLM never determines
 * diff structure; it supplies only {quote, quoteContext?, category,
 * explanation} annotations." Annotation targeting reuses the same rule as
 * corrections[]/quoteSpans[]: candidates are diff operations (never a bare
 * string occurrence in improved_answer), quoteContext disambiguates when the
 * quote is not unique across ops, and ambiguity (zero or >1 candidates) drops
 * only the annotation — the diff itself always renders in full.
 */
import type { IssueCategory } from '../../../types';

export type DiffOpType = 'equal' | 'delete' | 'insert' | 'replace';

export interface DiffOp {
  type: DiffOpType;
  /** Verbatim substring of the transcript ("before"); empty for a pure insert. */
  beforeText: string;
  /** Verbatim substring of improved_answer ("after"); empty for a pure delete. */
  afterText: string;
  /** Word-index range into the tokenized transcript this op covers (end exclusive). */
  beforeStart: number;
  beforeEnd: number;
}

export interface ChangeAnnotation {
  quote: string;
  quoteContext?: string;
  category: IssueCategory;
  explanation: string;
}

export interface AnnotatedDiffOp extends DiffOp {
  annotation?: ChangeAnnotation;
}

/** Tokenize on whitespace, keeping the whitespace so joins reconstruct the original string exactly. */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/** True for a token that's whitespace-only (kept as its own token by tokenize's capture group). */
function isSpace(token: string): boolean {
  return /^\s+$/.test(token);
}

/**
 * Standard word-level LCS diff, word-tokenized (whitespace tokens ride along
 * with their neighbour so equal runs of whitespace never surface as their own
 * op). Adjacent delete+insert pairs are merged into a single 'replace' op, so
 * a corrected word reads as one change rather than a delete immediately
 * followed by an insert.
 */
export function diffWords(before: string, after: string): DiffOp[] {
  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const m = beforeTokens.length;
  const n = afterTokens.length;

  // Standard LCS table over tokens (whitespace tokens participate normally —
  // two runs of "the same" whitespace collapse into 'equal' automatically).
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = beforeTokens[i] === afterTokens[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  type RawOp = { type: 'equal' | 'delete' | 'insert'; beforeIdx?: number; afterIdx?: number; token: string };
  const raw: RawOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (beforeTokens[i] === afterTokens[j]) {
      raw.push({ type: 'equal', beforeIdx: i, afterIdx: j, token: beforeTokens[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      raw.push({ type: 'delete', beforeIdx: i, token: beforeTokens[i] });
      i++;
    } else {
      raw.push({ type: 'insert', afterIdx: j, token: afterTokens[j] });
      j++;
    }
  }
  while (i < m) { raw.push({ type: 'delete', beforeIdx: i, token: beforeTokens[i] }); i++; }
  while (j < n) { raw.push({ type: 'insert', afterIdx: j, token: afterTokens[j] }); j++; }

  // Word-index (not token-index) counter for beforeStart/beforeEnd — only
  // non-whitespace tokens count as "words".
  let wordIndex = 0;
  const ops: DiffOp[] = [];
  let k = 0;
  while (k < raw.length) {
    const op = raw[k];

    if (op.type === 'equal') {
      const start = wordIndex;
      if (!isSpace(op.token)) wordIndex++;
      ops.push({ type: 'equal', beforeText: op.token, afterText: op.token, beforeStart: start, beforeEnd: wordIndex });
      k++;
      continue;
    }

    // Collect a contiguous run of delete/insert tokens (no 'equal' between
    // them) and merge into one replace/delete/insert op, so "va" -> "vais"
    // is one change, not delete("va") + insert("vais").
    const runStart = k;
    let deleted = '';
    let inserted = '';
    const start = wordIndex;
    while (k < raw.length && raw[k].type !== 'equal') {
      if (raw[k].type === 'delete') {
        deleted += raw[k].token;
        if (!isSpace(raw[k].token)) wordIndex++;
      } else {
        inserted += raw[k].token;
      }
      k++;
    }
    if (k === runStart) continue; // unreachable, guards against infinite loop

    const type: DiffOpType = deleted && inserted ? 'replace' : deleted ? 'delete' : 'insert';
    ops.push({ type, beforeText: deleted, afterText: inserted, beforeStart: start, beforeEnd: wordIndex });
  }

  return ops;
}

/**
 * Reassembles `after` (improved_answer) from diff ops verbatim — used only to
 * verify diffWords round-trips, never rendered directly.
 */
export function reconstructAfter(ops: DiffOp[]): string {
  return ops.map((op) => op.afterText).join('');
}

const NON_EQUAL: readonly DiffOpType[] = ['delete', 'insert', 'replace'];

/**
 * Attaches each annotation to the diff op whose `beforeText` its `quote`
 * identifies. Mirrors corrections[]/quoteSpans[] resolution (docs Stage 2):
 * candidates are diff operations, never a bare string occurrence in
 * improved_answer; quoteContext narrows when quote isn't unique across ops;
 * exactly one candidate -> attach, zero or many -> drop the annotation only.
 * The diff itself always renders in full regardless of how many annotations
 * resolve.
 */
export function attachChangeAnnotations(ops: DiffOp[], annotations: ChangeAnnotation[]): AnnotatedDiffOp[] {
  const result: AnnotatedDiffOp[] = ops.map((op) => ({ ...op }));
  const nonEqualIndices = result
    .map((op, idx) => (NON_EQUAL.includes(op.type) ? idx : -1))
    .filter((idx) => idx !== -1);

  // A "context window" around each op: its own text plus a few surrounding
  // words on each side, mirroring the server's quoteContext resolution ("a
  // few surrounding words" — docs Stage 2/3). Whitespace tokens are their own
  // ops (see tokenize), so the word-count budget only decrements on an
  // actual word, not on the spaces between them.
  const CONTEXT_WORD_RADIUS = 4;
  const isWhitespaceOnlyOp = (op: DiffOp): boolean => op.beforeText.trim() === '' && op.afterText.trim() === '';
  const contextWindow = (idx: number): string => {
    let before = '';
    let budget = CONTEXT_WORD_RADIUS;
    for (let p = idx - 1; p >= 0 && budget > 0; p--) {
      before = result[p].beforeText + result[p].afterText + before;
      if (!isWhitespaceOnlyOp(result[p])) budget--;
    }
    let after = '';
    budget = CONTEXT_WORD_RADIUS;
    for (let n = idx + 1; n < result.length && budget > 0; n++) {
      after += result[n].beforeText + result[n].afterText;
      if (!isWhitespaceOnlyOp(result[n])) budget--;
    }
    return before + result[idx].beforeText + result[idx].afterText + after;
  };

  for (const annotation of annotations) {
    const quote = annotation.quote;
    if (!quote) continue;

    let candidates = nonEqualIndices.filter((idx) => result[idx].beforeText.includes(quote));

    if (candidates.length > 1 && annotation.quoteContext) {
      const withContext = candidates.filter((idx) => contextWindow(idx).includes(annotation.quoteContext as string));
      if (withContext.length > 0) candidates = withContext;
    }

    if (candidates.length !== 1) continue; // ambiguous or unresolvable -> drop, never guess

    result[candidates[0]].annotation = annotation;
  }

  return result;
}
