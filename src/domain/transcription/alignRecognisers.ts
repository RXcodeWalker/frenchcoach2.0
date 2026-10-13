/**
 * Word-level alignment of two recognisers' text for the same speech (the
 * primary, Whisper, and a second opinion, Chrome's live captions).
 *
 * This is the ONE alignment implementation (transcription-accuracy plan,
 * Phases 3 and 4): Learn's "did we hear you right?" panel uses it now, and the
 * exam's server-side projection will import the same function. Pure, no I/O.
 *
 * What counts as agreement: the same word (case, punctuation and apostrophe
 * style ignored, accents kept) or a Category A sound-alike (il mange / ils
 * mangent, et / est, ...) — spellings that sound the same are never a
 * disagreement. What is left is an `AmbiguousSpan`:
 *  - `nearHomophone`: each word of the span is a Category B pair with what the
 *    other recogniser heard (un/en, ont/sont, le/les, du/de, ...);
 *  - `different`: anything else (a clearly different word, or a word only one
 *    recogniser heard). The primary recogniser wins; the span is information.
 *
 * With no second opinion (`singleRecogniser`) every primary word that belongs
 * to a Category B pair becomes a `nearHomophone` span whose alternatives are
 * the pair partners, so the learner is still shown the words most likely to be
 * confused by an accent.
 */

import { categoryAClass, soundsIdenticalInContext } from '../igcse/stt/homophones/classes';
import { NEAR_PAIRS, nearPairOf } from '../igcse/stt/homophones/nearPairs';
import { tokenize, type Token } from '../igcse/stt/homophones/text';

export type AmbiguousSpanKind = 'nearHomophone' | 'different';

export interface AmbiguousSpan {
  readonly kind: AmbiguousSpanKind;
  /** Primary token range `[primaryStart, primaryEnd)`. Empty when only the secondary recogniser heard words here. */
  readonly primaryStart: number;
  readonly primaryEnd: number;
  /** What the primary recogniser wrote for the range (core words, punctuation removed). */
  readonly primaryWords: readonly string[];
  /** What the secondary recogniser wrote for the same stretch (empty when it heard nothing there, or on a single-recogniser turn). */
  readonly secondaryWords: readonly string[];
  /**
   * Replacement options for the range, best first: the other recogniser's words
   * joined, or (single recogniser) the Category B partners of the one word.
   * Empty when there is nothing to offer.
   */
  readonly alternatives: readonly string[];
  readonly origin: 'disagreement' | 'single-recogniser';
}

export interface AlignmentResult {
  /** The primary text's tokens, in order; spans index into this list. */
  readonly primaryTokens: readonly Token[];
  readonly spans: readonly AmbiguousSpan[];
  /** True when there was no usable second opinion. */
  readonly singleRecogniser: boolean;
}

type Op = 'match' | 'sub' | 'del' | 'ins';

/** Whether primary word `i` and secondary word `j` count as the same word. */
function sameWord(p: readonly Token[], s: readonly Token[], i: number, j: number): boolean {
  const a = p[i];
  const b = s[j];
  if (a.lower === b.lower) return true;
  const pause = a.pauseAfter || b.pauseAfter;
  return (
    categoryAClass(a.lower, b.lower) !== null &&
    soundsIdenticalInContext(a.lower, b.lower, p[i + 1]?.lower, pause) &&
    soundsIdenticalInContext(a.lower, b.lower, s[j + 1]?.lower, pause)
  );
}

/** Minimum-edit alignment; diagonal (match/substitute) moves win ties so a swapped word stays one span. */
function editOps(p: readonly Token[], s: readonly Token[]): Op[] {
  const n = p.length;
  const m = s.length;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) cost[i][0] = i;
  for (let j = 1; j <= m; j++) cost[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = cost[i - 1][j - 1] + (sameWord(p, s, i - 1, j - 1) ? 0 : 1);
      cost[i][j] = Math.min(diag, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = sameWord(p, s, i - 1, j - 1);
      if (cost[i][j] === cost[i - 1][j - 1] + (same ? 0 : 1)) {
        ops.push(same ? 'match' : 'sub');
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      ops.push('del');
      i--;
    } else {
      ops.push('ins');
      j--;
    }
  }
  return ops.reverse();
}

function coreOf(t: Token): string {
  return t.core || t.lower;
}

function disagreementSpan(
  primary: readonly Token[],
  secondary: readonly Token[],
  pStart: number,
  pEnd: number,
  sStart: number,
  sEnd: number,
): AmbiguousSpan[] {
  const pWords = primary.slice(pStart, pEnd);
  const sWords = secondary.slice(sStart, sEnd);
  // Same number of words on both sides: judge each position on its own, so one
  // Category B pair next to a clearly different word is still recognised.
  if (pWords.length > 0 && pWords.length === sWords.length) {
    return pWords.map((pw, k) => {
      const sw = sWords[k];
      return {
        kind: nearPairOf(pw.lower, sw.lower) ? ('nearHomophone' as const) : ('different' as const),
        primaryStart: pStart + k,
        primaryEnd: pStart + k + 1,
        primaryWords: [coreOf(pw)],
        secondaryWords: [coreOf(sw)],
        alternatives: [coreOf(sw)],
        origin: 'disagreement' as const,
      };
    });
  }
  const secondaryWords = sWords.map(coreOf);
  return [
    {
      kind: 'different',
      primaryStart: pStart,
      primaryEnd: pEnd,
      primaryWords: pWords.map(coreOf),
      secondaryWords,
      alternatives: secondaryWords.length > 0 ? [secondaryWords.join(' ')] : [],
      origin: 'disagreement',
    },
  ];
}

/** Category B partners of one word, in table order. */
export function nearPartnersOf(lower: string): string[] {
  const out: string[] = [];
  for (const p of NEAR_PAIRS) {
    if (p.a === lower) out.push(p.b);
    else if (p.b === lower) out.push(p.a);
  }
  return out;
}

function singleRecogniserSpans(primary: readonly Token[]): AmbiguousSpan[] {
  const spans: AmbiguousSpan[] = [];
  primary.forEach((t, i) => {
    const partners = nearPartnersOf(t.lower);
    if (partners.length === 0) return;
    spans.push({
      kind: 'nearHomophone',
      primaryStart: i,
      primaryEnd: i + 1,
      primaryWords: [coreOf(t)],
      secondaryWords: [],
      alternatives: partners,
      origin: 'single-recogniser',
    });
  });
  return spans;
}

/**
 * Aligns `primaryText` with `secondaryText`. A blank secondary means a single
 * recogniser. Never throws and never changes either text.
 */
export function alignRecognisers(primaryText: string, secondaryText: string | null | undefined): AlignmentResult {
  const primary = tokenize(primaryText).filter((t) => t.lower);
  const secondary = tokenize(secondaryText ?? '').filter((t) => t.lower);
  if (secondary.length === 0) {
    return { primaryTokens: primary, spans: singleRecogniserSpans(primary), singleRecogniser: true };
  }

  const ops = editOps(primary, secondary);
  const spans: AmbiguousSpan[] = [];
  let pi = 0;
  let si = 0;
  let k = 0;
  while (k < ops.length) {
    if (ops[k] === 'match') {
      pi++;
      si++;
      k++;
      continue;
    }
    const pStart = pi;
    const sStart = si;
    while (k < ops.length && ops[k] !== 'match') {
      if (ops[k] !== 'ins') pi++;
      if (ops[k] !== 'del') si++;
      k++;
    }
    spans.push(...disagreementSpan(primary, secondary, pStart, pi, sStart, si));
  }

  // A Category B word both recognisers agree on stays unflagged: if they both
  // heard "sont", that is what was said.
  return { primaryTokens: primary, spans, singleRecogniser: false };
}
