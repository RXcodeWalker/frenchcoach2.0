/**
 * Quote rules for examiner-style feedback (Phase 3 plan, "Shared invariants").
 *
 * Every claim is grounded verbatim in the turn it is about (isQuoteGrounded,
 * the same primitive the audited scorer uses). On top of that:
 *  - a minimum quote length, so "je" or "le" cannot "ground" a claim. This is
 *    app policy and UNVALIDATED — no Cambridge document states it: an error
 *    quote needs 2+ words or 6+ characters; a strength or next-step quote
 *    needs 3+ words;
 *  - a strength whose quote overlaps a reported error is dropped (praising a
 *    phrase the same feedback calls broken is a contradiction);
 *  - rail claims are held to a character budget by dropping, never by cutting
 *    a claim mid-word.
 */

import { canonicalizeForMatch, normalizeForMatch } from '../../igcse/text/normalize';
import { isQuoteGrounded } from '../../igcse/judgement/schema';

// UNVALIDATED app policy (see module header).
export const ERROR_QUOTE_MIN_WORDS = 2;
export const ERROR_QUOTE_MIN_CHARS = 6;
export const CLAIM_QUOTE_MIN_WORDS = 3;

function wordCount(text: string): number {
  return canonicalizeForMatch(text).split(/\s+/).filter(Boolean).length;
}

export function isGroundedQuote(quote: unknown, corpus: string): quote is string {
  return typeof quote === 'string' && isQuoteGrounded(quote, corpus);
}

export function meetsErrorQuoteMinimum(quote: string): boolean {
  const canonical = canonicalizeForMatch(quote);
  return wordCount(canonical) >= ERROR_QUOTE_MIN_WORDS || canonical.length >= ERROR_QUOTE_MIN_CHARS;
}

export function meetsClaimQuoteMinimum(quote: string): boolean {
  return wordCount(quote) >= CLAIM_QUOTE_MIN_WORDS;
}

/** The same words, ignoring case and edge punctuation. */
export function sameQuote(a: string, b: string): boolean {
  const ca = canonicalizeForMatch(a);
  return ca !== '' && ca === canonicalizeForMatch(b);
}

/**
 * True when the two quotes cover any of the same text. Located in the
 * transcript (so a partial overlap counts); if either cannot be located the
 * check falls back to containment.
 */
export function quotesOverlap(a: string, b: string, transcript: string): boolean {
  const ca = canonicalizeForMatch(a);
  const cb = canonicalizeForMatch(b);
  if (ca === '' || cb === '') return false;
  const text = normalizeForMatch(transcript);
  const ia = text.indexOf(ca);
  const ib = text.indexOf(cb);
  if (ia !== -1 && ib !== -1) return ia < ib + cb.length && ib < ia + ca.length;
  return ca.includes(cb) || cb.includes(ca);
}

/**
 * Keeps claims in priority order while each fits `perClaim` characters and the
 * running total fits `total`; a claim that doesn't fit is dropped (its index is
 * absent from the result), never truncated. Returns the kept indices.
 */
export function fitClaimBudget(claims: readonly string[], perClaim: number, total: number): Set<number> {
  const kept = new Set<number>();
  let used = 0;
  claims.forEach((claim, i) => {
    const len = claim.trim().length;
    if (len === 0 || len > perClaim || used + len > total) return;
    kept.add(i);
    used += len;
  });
  return kept;
}
