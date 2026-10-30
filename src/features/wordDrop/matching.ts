import { normalizeFrench } from '../minigames/utils/normalizeFrench';
import type { Direction } from './types';

/**
 * Typed-answer matching for Word Drop. Both sides go through the same
 * normaliser, so accents, case, apostrophes and a leading article or "to"
 * never decide whether an answer counts.
 */

const EN_LEAD = /^(to|the|a|an) (?=\S)/;
const FR_LEAD = /^(le|la|les|un|une|des|du|de la) (?=\S)|^(l|d)'(?=\S)/;

/** What a typed answer or an accepted answer is compared as. */
export function normalizeAnswer(input: string, language: 'en' | 'fr'): string {
  const n = normalizeFrench(input).replace(/\s+/g, ' ');
  return n.replace(language === 'en' ? EN_LEAD : FR_LEAD, '');
}

/** The language the learner types in. */
export function typedLanguage(direction: Direction): 'en' | 'fr' {
  return direction === 'fr-en' ? 'en' : 'fr';
}

interface Answerable {
  accept: string[];
}

/** Levenshtein distance, early-out above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/** How many slips Enter forgives for an answer of this length. */
function allowedSlips(len: number): number {
  if (len >= 9) return 2;
  if (len >= 5) return 1;
  return 0;
}

export function isExact<T extends Answerable>(word: T, typed: string): boolean {
  return typed.length > 0 && word.accept.includes(typed);
}

export function isClose<T extends Answerable>(word: T, typed: string): boolean {
  if (typed.length < 4) return false;
  return word.accept.some(a => {
    const slips = allowedSlips(a.length);
    return slips > 0 && editDistance(typed, a, slips) <= slips;
  });
}

/**
 * Whether typing `typed` is still on the way to a longer accepted answer of
 * some falling word ("eat" while "eater" is also falling). Live matching holds
 * its fire in that case so a short answer doesn't steal a long one.
 */
export function isStillTyping<T extends Answerable>(words: T[], typed: string): boolean {
  return words.some(w => w.accept.some(a => a.length > typed.length && a.startsWith(typed)));
}

/**
 * The word the typed text is heading for: the lowest one whose answer starts
 * with it. The play field outlines it so the learner sees the keys landing.
 */
export function lockedTarget<T extends Answerable & { y: number }>(words: T[], typed: string): T | null {
  if (typed.length === 0) return null;
  let best: T | null = null;
  for (const w of words) {
    if (w.accept.some(a => a.startsWith(typed)) && (best === null || w.y > best.y)) best = w;
  }
  return best;
}

/** The lowest word (closest to the floor) among those matching the predicate. */
export function lowestWhere<T extends { y: number }>(words: T[], test: (w: T) => boolean): T | null {
  let best: T | null = null;
  for (const w of words) if (test(w) && (best === null || w.y > best.y)) best = w;
  return best;
}

/** "c · · ·": the first letter and the length of the main answer, shown once a word is low. */
export function hintFor(answer: string): string {
  const chars = [...answer];
  return chars.map((c, i) => (i === 0 || c === ' ' ? c : '·')).join('');
}
