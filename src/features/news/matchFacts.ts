/**
 * Which of a story's facts a spoken retelling carries — docs/systems/daily-news.md §3.
 *
 * Deterministic and instant (no AI call): a fact is covered when every one of
 * its cue groups has a match, so naming one keyword is never enough. Both sides
 * are normalised the same way — lower case, accents, apostrophes and hyphens
 * removed, numbers written as digits turned into French words (the recogniser
 * writes "10" where the learner said « dix »).
 */
import type { NewsFact } from '../../data/news/types';

const UNITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function below100(n: number): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix ${UNITS[n - 10]}`;
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS[t];
    return u === 1 ? `${TENS[t]} et un` : `${TENS[t]} ${UNITS[u]}`;
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante ${below100(n - 60)}`;
  if (n === 80) return 'quatre vingts';
  return `quatre vingt ${below100(n - 80)}`;
}

/** A whole number 0–9999 in French words, hyphen-free (normalised form). Others are left as digits. */
export function numberToFrench(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n);
  if (n < 100) return below100(n);
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const head = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 ? 's' : ''}`;
    return rest === 0 ? head : `${head} ${below100(rest)}`;
  }
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = th === 1 ? 'mille' : `${below100(th)} mille`;
  return rest === 0 ? head : `${head} ${numberToFrench(rest)}`;
}

/** Lower case, no accents, apostrophes/hyphens/punctuation → spaces, digits → French words. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/œ/g, 'oe')
    .replace(/(\d)[\s.,'](?=\d{3}(?!\d))/gu, '$1') // "1 200" / "1.200" -> "1200" (\s covers no-break spaces)
    .replace(/\d+/g, d => numberToFrench(Number(d)))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesAlternative(normalizedText: string, alternative: string): boolean {
  const prefix = alternative.endsWith('*');
  const needle = normalizeForMatch(prefix ? alternative.slice(0, -1) : alternative);
  if (!needle) return false;
  const pattern = prefix ? `(?:^| )${escape(needle)}[a-z]*(?= |$)` : `(?:^| )${escape(needle)}(?= |$)`;
  return new RegExp(pattern).test(normalizedText);
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when every cue group of `fact` has at least one alternative in `transcript`. */
export function factCovered(transcript: string, fact: Pick<NewsFact, 'cues'>): boolean {
  const text = normalizeForMatch(transcript);
  if (!text || fact.cues.length === 0) return false;
  return fact.cues.every(group => group.some(alt => matchesAlternative(text, alt)));
}

/** True when `alternative` (one cue) occurs in `text` — used by the lint to prove a cue is in its story. */
export function cueOccurs(text: string, alternative: string): boolean {
  return matchesAlternative(normalizeForMatch(text), alternative);
}

export interface FactMatch {
  covered: string[];
  missed: string[];
}

export function matchFacts(transcript: string, facts: readonly NewsFact[]): FactMatch {
  const covered: string[] = [];
  const missed: string[] = [];
  for (const fact of facts) (factCovered(transcript, fact) ? covered : missed).push(fact.id);
  return { covered, missed };
}
