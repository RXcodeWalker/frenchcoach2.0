import { normaliseTokens } from './normalise';

export interface WerResult {
  /** substitutions + deletions + insertions */
  errors: number;
  /** reference token count */
  refLength: number;
  /** errors / refLength; 0 when both sides are empty, Infinity when only the reference is empty */
  wer: number;
}

/** Word error rate over normalised tokens (Levenshtein, unit costs). */
export function wordErrorRate(reference: string, hypothesis: string): WerResult {
  const ref = normaliseTokens(reference);
  const hyp = normaliseTokens(hypothesis);
  const prev = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= hyp.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  const errors = prev[hyp.length];
  const wer = ref.length === 0 ? (hyp.length === 0 ? 0 : Infinity) : errors / ref.length;
  return { errors, refLength: ref.length, wer };
}

/** Nearest-rank percentile (p in 0..100). NaN for an empty list. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

export const FILLER_TOKENS: ReadonlySet<string> = new Set(['euh', 'heu', 'hum', 'hmm', 'bah', 'ben']);

/**
 * Of the fillers in the verbatim reference, how many survive in the
 * hypothesis (multiset match). null when the reference has none.
 */
export function fillerRetention(verbatimRef: string, hypothesis: string): number | null {
  const want = normaliseTokens(verbatimRef).filter((t) => FILLER_TOKENS.has(t));
  if (want.length === 0) return null;
  const have = new Map<string, number>();
  for (const t of normaliseTokens(hypothesis)) if (FILLER_TOKENS.has(t)) have.set(t, (have.get(t) ?? 0) + 1);
  let kept = 0;
  for (const t of want) {
    const n = have.get(t) ?? 0;
    if (n > 0) {
      kept++;
      have.set(t, n - 1);
    }
  }
  return kept / want.length;
}

/** Known silence-hallucination fragments (Whisper's YouTube-outro habit). */
const HALLUCINATION_PATTERNS = [/amara/, /sous[- ]?titr/, /merci d'avoir regard/, /abonne/, /^merci\.?$/];

/**
 * A hypothesis is a hallucination when the clip is silence (any words at all)
 * or when it matches a known artefact phrase.
 */
export function isHallucination(clipKind: string, hypothesis: string): boolean {
  const tokens = normaliseTokens(hypothesis);
  if (tokens.length === 0) return false;
  if (clipKind === 'silence') return true;
  const flat = hypothesis.normalize('NFC').toLowerCase().replace(/[’]/g, "'");
  return HALLUCINATION_PATTERNS.some((re) => re.test(flat));
}
