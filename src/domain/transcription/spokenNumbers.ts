/**
 * How a number written in digits is said in French, for comparing two
 * recognisers' transcripts (alignRecognisers.ts, `spokenNumbers` option).
 * Whisper tends to write « le 1er avantage », « 15 ans », Chrome's captions
 * « le premier avantage », « quinze ans »: the same sounds, so they must not be
 * shown to the learner as a disagreement.
 *
 * Covers whole numbers 0–999 999, ordinals (1er, 1re/1ère, 2e/2ème, 2nd/2nde)
 * and clock times (8h, 8h30). Anything else (decimals, 10%, 3,5) is left alone
 * and compared as written. Pure.
 */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];
const TENS: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function below100(n: number): string[] {
  if (n <= 16) return [UNITS[n]];
  if (n < 20) return ['dix', UNITS[n - 10]];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    // soixante-dix… / quatre-vingt-dix…: the base plus 10–19.
    const base = ten === 7 ? ['soixante'] : ['quatre', 'vingt'];
    const rest = below100(10 + unit);
    return ten === 7 && unit === 1 ? [...base, 'et', ...rest] : [...base, ...rest];
  }
  if (ten === 8) return unit === 0 ? ['quatre', 'vingts'] : ['quatre', 'vingt', ...below100(unit)];
  if (unit === 0) return [TENS[ten]];
  if (unit === 1) return [TENS[ten], 'et', 'un'];
  return [TENS[ten], UNITS[unit]];
}

function below1000(n: number): string[] {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds === 0 ? [] : hundreds === 1 ? ['cent'] : [UNITS[hundreds], rest === 0 ? 'cents' : 'cent'];
  return rest === 0 && hundreds > 0 ? head : [...head, ...below100(rest)];
}

/** The words of a cardinal number, e.g. 21 → ['vingt', 'et', 'un']. */
export function cardinalWords(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000) return [];
  if (n < 1000) return below1000(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands === 1 ? ['mille'] : [...below1000(thousands), 'mille'];
  return rest === 0 ? head : [...head, ...below1000(rest)];
}

/** The words of an ordinal number, e.g. 1 → ['premier'], 21 → ['vingt', 'et', 'unième']. */
export function ordinalWords(n: number, feminine = false): string[] {
  if (n === 1) return [feminine ? 'première' : 'premier'];
  const words = cardinalWords(n);
  if (words.length === 0) return [];
  const last = words[words.length - 1];
  const stem =
    last === 'cinq' ? 'cinqu' : last === 'neuf' ? 'neuv' : last.endsWith('s') && last !== 'trois' ? last.slice(0, -1) : last.replace(/e$/, '');
  return [...words.slice(0, -1), `${stem}ième`];
}

const ORDINAL = /^(\d{1,6})(er|re|ère|ere|e|ème|eme|è|nd|nde|ième|ieme)$/;
const CARDINAL = /^\d{1,6}$/;
const TIME = /^(\d{1,2})h(\d{2})?$/;

/**
 * The spoken words of one lower-case token written with digits, or null when
 * the token is not a number this module reads. Each entry lists the accepted
 * spellings of one spoken word (the first is canonical): « 1 » is « un » or
 * « une », « 80 » ends in « vingts » or « vingt ».
 */
export function spokenNumberWords(lower: string): string[][] | null {
  const ordinal = ORDINAL.exec(lower);
  if (ordinal) {
    const n = Number(ordinal[1]);
    const feminine = ordinal[2] === 're' || ordinal[2] === 'ère' || ordinal[2] === 'ere' || ordinal[2] === 'nde';
    if (n === 2 && ordinal[2].startsWith('nd')) return [[feminine ? 'seconde' : 'second', 'deuxième']];
    // « 1e » is a common misspelling of 1er; either reading is accepted.
    if (n === 1) return [feminine ? ['première', 'premier'] : ['premier', 'première']];
    const words = ordinalWords(n);
    return words.length ? words.map((w) => [w]) : null;
  }
  const time = TIME.exec(lower);
  if (time) {
    const hours = Number(time[1]);
    if (hours > 24) return null;
    const words = [...withAlternatives(cardinalWords(hours)), hours === 1 ? ['heure', 'heures'] : ['heures', 'heure']];
    const minutes = time[2] ? Number(time[2]) : 0;
    return minutes === 0 ? words : minutes < 60 ? [...words, ...withAlternatives(cardinalWords(minutes))] : null;
  }
  if (CARDINAL.test(lower)) {
    const words = cardinalWords(Number(lower));
    return words.length ? withAlternatives(words) : null;
  }
  return null;
}

/** « un » can be « une »; a plural « vingts »/« cents » can be written without its s. */
function withAlternatives(words: string[]): string[][] {
  return words.map((w) =>
    w === 'un' ? ['un', 'une'] : w === 'vingts' || w === 'cents' ? [w, w.slice(0, -1)] : w === 'vingt' || w === 'cent' ? [w, `${w}s`] : [w],
  );
}
