/**
 * Deterministic word matching for the news show — docs/systems/daily-news.md §7.
 *
 * Used for "story words you used" and by the bank lint (a glossary entry must
 * be in its story). Both sides are normalised the same way — lower case,
 * accents, apostrophes and hyphens removed, numbers written as digits turned
 * into French words (the recogniser writes "10" where the learner said « dix »).
 */

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

/**
 * True when `phrase` occurs in `text` as whole words. A phrase ending in `*`
 * matches any word starting with it (« recycl* »).
 */
export function phraseOccurs(text: string, phrase: string): boolean {
  return matchesAlternative(normalizeForMatch(text), phrase);
}

/**
 * A glossary word's stem for "did the learner use it": the last word may take
 * an ending (« ruches » → « ruche* »), so plurals and verb forms still count.
 */
export function usedPhrase(text: string, phrase: string): boolean {
  if (phraseOccurs(text, phrase)) return true;
  const words = normalizeForMatch(phrase).split(' ');
  const last = words[words.length - 1];
  if (last.length < 5) return false;
  words[words.length - 1] = `${last.slice(0, last.length - 2)}*`;
  return phraseOccurs(text, words.join(' '));
}
