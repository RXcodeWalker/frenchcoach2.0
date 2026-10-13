/**
 * Word-matching between two recognisers' transcripts of the same speech
 * (transcription-accuracy plan, Phase 3 "Shared alignment"). The primary
 * recogniser (Whisper) is what the student sees; the secondary (Chrome's live
 * captions) is the second opinion. Learn's confirm screen underlines the spans
 * where they disagree; the exam (Phase 4) imports this same module, so there is
 * exactly one implementation of "do these two transcripts agree".
 *
 * Owner rules this encodes (see `stt/homophones/`):
 *  - Category A (spellings that sound the same: il mange / ils mangent, et/est,
 *    a/à…) is never a disagreement. Both texts are respelled to their
 *    context-consistent spelling first, and a residual Category A difference
 *    counts as agreement.
 *  - Category B (audible, accent-confusable pairs: un/en, ont/sont…) is a
 *    disagreement of kind `nearHomophone`. Any other difference is `different`.
 *  - It never decides which recogniser was right. It reports the span and both
 *    readings; the caller applies the policy (Learn: the student taps).
 *
 * Pure and deterministic. Hyphenated words are compared part by part
 * ("peut-être" vs "peut être" agree) and every span is widened to whole
 * whitespace tokens of the primary text, so a span can always be replaced.
 */

import { soundsIdenticalInContext } from '../igcse/stt/homophones/classes';
import { nearPairOf } from '../igcse/stt/homophones/nearPairs';
import { respell, type RespellChange } from '../igcse/stt/homophones/respell';
import { matchCase, tokenize, type Token } from '../igcse/stt/homophones/text';

export type SpanKind = 'nearHomophone' | 'different';

export interface AlignedSpan {
  readonly kind: SpanKind;
  /** Token range [start, end) in the primary text. start === end when only the secondary recogniser heard something here. */
  readonly start: number;
  readonly end: number;
  /** The primary recogniser's words for the range, punctuation included. Empty when start === end. */
  readonly primaryWords: string;
  /** The secondary recogniser's words for the same stretch, punctuation removed. Empty when it heard nothing here. */
  readonly secondaryWords: string;
  /** Both sides heard something, so the secondary's reading can replace the primary's. */
  readonly swappable: boolean;
  /** Category B pair ids involved (`nearHomophone` spans only). */
  readonly pairIds: readonly string[];
}

export interface RecogniserAlignment {
  /** The primary text, respelled (Category A) and with single spaces. Same token count as the input. */
  readonly primaryText: string;
  /** The secondary text, respelled and with single spaces. */
  readonly secondaryText: string;
  /** Category A respellings applied to the primary text. */
  readonly respelled: readonly RespellChange[];
  /** Disagreements, in text order, never overlapping. Empty when the texts agree or either text is blank. */
  readonly spans: readonly AlignedSpan[];
}

interface Unit {
  /** Lower-case word without punctuation or hyphens. */
  readonly word: string;
  /** Index of the whitespace token this unit came from. */
  readonly token: number;
  /** The unit ends its token with written punctuation (no liaison across it). */
  readonly pauseAfter: boolean;
}

type Op =
  | { readonly type: 'match' }
  | { readonly type: 'sub'; readonly p: number; readonly s: number }
  | { readonly type: 'del'; readonly p: number }
  | { readonly type: 'ins'; readonly s: number };

const COST_NEAR = 0.4;
const COST_SUB = 1;
const COST_GAP = 1;

function toUnits(tokens: readonly Token[]): Unit[] {
  const units: Unit[] = [];
  tokens.forEach((t, token) => {
    const parts = t.lower.split('-').filter(Boolean);
    parts.forEach((word, i) => units.push({ word, token, pauseAfter: t.pauseAfter && i === parts.length - 1 }));
  });
  return units;
}

function respelledTokens(text: string): { tokens: Token[]; text: string; changes: readonly RespellChange[] } {
  const result = respell(text);
  const tokens = tokenize(result.text);
  return { tokens, text: tokens.map((t) => t.raw).join(' '), changes: result.changes };
}

/** Whether two units are the same word, or sound the same where they stand (Category A). */
function agree(a: Unit, b: Unit, nextA: Unit | undefined, nextB: Unit | undefined): boolean {
  if (a.word === b.word) return true;
  const pause = a.pauseAfter || b.pauseAfter;
  return soundsIdenticalInContext(a.word, b.word, nextA?.word, pause) && soundsIdenticalInContext(a.word, b.word, nextB?.word, pause);
}

function alignUnits(a: readonly Unit[], b: readonly Unit[]): Op[] {
  const n = a.length;
  const m = b.length;
  const same = (i: number, j: number) => agree(a[i], b[j], a[i + 1], b[j + 1]);
  const subCost = (i: number, j: number) => (same(i, j) ? 0 : nearPairOf(a[i].word, b[j].word) ? COST_NEAR : COST_SUB);

  // dp[i][j] = cheapest alignment of a[i..] with b[j..].
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) dp[i][m] = dp[i + 1][m] + COST_GAP;
  for (let j = m - 1; j >= 0; j--) dp[n][j] = dp[n][j + 1] + COST_GAP;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = Math.min(dp[i + 1][j + 1] + subCost(i, j), dp[i + 1][j] + COST_GAP, dp[i][j + 1] + COST_GAP);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  const EPS = 1e-9;
  while (i < n || j < m) {
    if (i < n && j < m && Math.abs(dp[i][j] - (dp[i + 1][j + 1] + subCost(i, j))) < EPS) {
      ops.push(same(i, j) ? { type: 'match' } : { type: 'sub', p: i, s: j });
      i++;
      j++;
    } else if (i < n && Math.abs(dp[i][j] - (dp[i + 1][j] + COST_GAP)) < EPS) {
      ops.push({ type: 'del', p: i });
      i++;
    } else {
      ops.push({ type: 'ins', s: j });
      j++;
    }
  }
  return ops;
}

interface RawSpan {
  kind: SpanKind;
  p: number[];
  s: number[];
  pairIds: string[];
  /** Index of the next primary unit when the span began (position for a span with no primary units). */
  at: number;
}

function groupOps(ops: readonly Op[], pu: readonly Unit[], su: readonly Unit[]): RawSpan[] {
  const spans: RawSpan[] = [];
  let open: RawSpan | null = null;
  let pPtr = 0;
  for (const op of ops) {
    if (op.type === 'match') {
      open = null;
      pPtr++;
      continue;
    }
    const near = op.type === 'sub' ? nearPairOf(pu[op.p].word, su[op.s].word) : null;
    const kind: SpanKind = near ? 'nearHomophone' : 'different';
    if (!open || open.kind !== kind) {
      open = { kind, p: [], s: [], pairIds: [], at: pPtr };
      spans.push(open);
    }
    if (op.type !== 'ins') {
      open.p.push(op.p);
      pPtr++;
    }
    if (op.type !== 'del') open.s.push(op.s);
    if (near) open.pairIds.push(near.id);
  }
  return spans;
}

interface TokenSpan {
  kind: SpanKind;
  start: number;
  end: number;
  sStart: number;
  sEnd: number;
  pairIds: string[];
}

/** Widens unit spans to whole tokens, then merges any that now touch the same token. */
function toTokenSpans(raw: readonly RawSpan[], pu: readonly Unit[], su: readonly Unit[], primaryTokenCount: number): TokenSpan[] {
  const spans: TokenSpan[] = raw.map((r) => {
    const start = r.p.length ? pu[r.p[0]].token : (pu[r.at]?.token ?? primaryTokenCount);
    const end = r.p.length ? pu[r.p[r.p.length - 1]].token + 1 : start;
    const sStart = r.s.length ? su[r.s[0]].token : 0;
    const sEnd = r.s.length ? su[r.s[r.s.length - 1]].token + 1 : 0;
    return { kind: r.kind, start, end, sStart, sEnd, pairIds: r.pairIds };
  });
  const merged: TokenSpan[] = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (prev && span.start < prev.end && span.end > span.start) {
      prev.kind = prev.kind === span.kind ? prev.kind : 'different';
      prev.end = Math.max(prev.end, span.end);
      if (span.sEnd > span.sStart) {
        prev.sStart = prev.sEnd > prev.sStart ? Math.min(prev.sStart, span.sStart) : span.sStart;
        prev.sEnd = Math.max(prev.sEnd, span.sEnd);
      }
      prev.pairIds.push(...span.pairIds);
    } else {
      merged.push(span);
    }
  }
  return merged;
}

/**
 * Aligns the secondary transcript against the primary one. `spans` is empty
 * when the texts agree, and also when either text is blank (a single
 * recogniser has no second opinion to disagree with).
 */
export function alignRecognisers(primary: string, secondary: string): RecogniserAlignment {
  const p = respelledTokens(primary);
  const s = respelledTokens(secondary);
  const base = { primaryText: p.text, secondaryText: s.text, respelled: p.changes };
  if (p.tokens.length === 0 || s.tokens.length === 0) return { ...base, spans: [] };

  const pu = toUnits(p.tokens);
  const su = toUnits(s.tokens);
  const raw = groupOps(alignUnits(pu, su), pu, su);
  const spans: AlignedSpan[] = toTokenSpans(raw, pu, su, p.tokens.length).map((t) => {
    const secondaryWords = t.sEnd > t.sStart ? s.tokens.slice(t.sStart, t.sEnd).map((x) => x.core).filter(Boolean).join(' ') : '';
    return {
      kind: t.kind,
      start: t.start,
      end: t.end,
      primaryWords: p.tokens.slice(t.start, t.end).map((x) => x.raw).join(' '),
      secondaryWords,
      swappable: t.end > t.start && secondaryWords !== '',
      pairIds: Object.freeze([...new Set(t.pairIds)]),
    };
  });
  return { ...base, spans };
}

/**
 * What the span's tokens read as after swapping in the other recogniser's
 * words: the punctuation around the replaced words and the first word's
 * capitalisation are kept, so the text reads as it did before. Null when the
 * span cannot be swapped (the other recogniser heard nothing there).
 */
export function swappedWords(alignment: RecogniserAlignment, spanIndex: number): string | null {
  const span = alignment.spans[spanIndex];
  if (!span || !span.swappable) return null;
  const tokens = tokenize(alignment.primaryText);
  const first = tokens[span.start];
  const last = tokens[span.end - 1];
  const words = span.secondaryWords.split(' ');
  words[0] = matchCase(first.core, words[0]);
  return `${first.lead}${words.join(' ')}${last.trail}`;
}

/**
 * The primary text with the secondary recogniser's reading swapped in for the
 * chosen spans (indexes into `alignment.spans`). Only swappable spans change.
 */
export function applyAlternatives(alignment: RecogniserAlignment, chosen: Iterable<number>): string {
  const pick = new Set(chosen);
  const tokens = tokenize(alignment.primaryText);
  const out: string[] = [];
  let at = 0;
  alignment.spans.forEach((span, index) => {
    const swapped = pick.has(index) ? swappedWords(alignment, index) : null;
    if (swapped === null) return;
    for (; at < span.start; at++) out.push(tokens[at].raw);
    out.push(swapped);
    at = span.end;
  });
  for (; at < tokens.length; at++) out.push(tokens[at].raw);
  return out.join(' ');
}
