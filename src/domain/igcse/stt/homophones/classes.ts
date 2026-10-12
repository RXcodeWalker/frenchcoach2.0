/**
 * Category A sound-alike classes (owner decision, transcription-accuracy plan
 * Phase 4): written forms that SOUND THE SAME, so a spoken answer cannot show
 * which one the candidate meant. Context decides the spelling (`respell.ts`)
 * and a mark is never lost over a difference inside one class.
 *
 * Two kinds of class:
 *  - closed: an explicit list of function words (a/à, et/est, ces/ses/c'est…);
 *  - pattern: a silent-ending rule over a shared stem (il mange / ils mangent,
 *    mangé / manger / mangez / mangeait, chat / chats, ami / amie, fais / fait).
 *
 * A pattern rule has no dictionary, so it also "matches" pairs of which one
 * side is not a word (e.g. hiver / hivé). That is harmless: these tables only
 * ever compare two spellings someone actually produced, and the respeller only
 * writes forms it can build from its own verb lists (`lexicon.ts`). What is
 * NOT harmless is two real words that differ audibly; each such collision a
 * rule would otherwise make is listed in that rule's exclusions.
 *
 * `liaisonSensitive`: the forms are only identical before a consonant or a
 * pause, because before a vowel one of them carries a liaison the other does
 * not (ils‿aiment vs il aime). It is set only where that liaison is
 * obligatory or near-obligatory in speech; where it is optional and rarely
 * made (verb endings, plural nouns), a missing liaison proves nothing.
 *
 * Uncertain entries lean towards KEEPING the error (no class): an inaudible
 * error that is shown costs less than an audible one that is excused.
 *
 * Nothing here is wired into the app yet (stage 2). Any change to a list or a
 * rule changes marks once it is: bump HOMOPHONE_TABLE_VERSION (`version.ts`).
 */

import { normalizeWord, parseToken, splitElision, startsWithVowelSound, tokenize } from './text';

export interface SoundClassInfo {
  readonly id: string;
  /** Plain-English description, for the owner's review list. */
  readonly description: string;
  readonly liaisonSensitive: boolean;
}

export interface ClosedSoundClass extends SoundClassInfo {
  readonly kind: 'closed';
  readonly forms: readonly string[];
}

export interface PatternSoundClass extends SoundClassInfo {
  readonly kind: 'pattern';
  /** Two real words the rule would otherwise pair although they differ audibly. */
  readonly exclusions: readonly string[];
  readonly match: (a: string, b: string) => boolean;
}

export type SoundClass = ClosedSoundClass | PatternSoundClass;

function closed(id: string, forms: string[], liaisonSensitive: boolean, description: string): ClosedSoundClass {
  return Object.freeze({ kind: 'closed' as const, id, forms: Object.freeze(forms), liaisonSensitive, description });
}

export const CLOSED_CLASSES: readonly ClosedSoundClass[] = Object.freeze([
  closed('il-ils', ['il', 'ils'], true, 'il / ils'),
  closed('elle-elles', ['elle', 'elles'], true, 'elle / elles'),
  closed('a', ['a', 'à', 'as'], false, 'a / à / as'),
  closed('ou', ['ou', 'où'], false, 'ou / où'),
  // Liaison after "est" is optional, so a missing [t] does not show "et".
  closed('et-est', ['et', 'est', 'es'], false, 'et / est / es'),
  closed('ces-cest', ['ces', 'ses', "c'est", "s'est", 'sais', 'sait'], true, "ces / ses / c'est / s'est / sais / sait"),
  closed('cetait', ["c'était", "s'était"], false, "c'était / s'était"),
  closed('la', ['la', 'là', "l'a", "l'as"], false, "la / là / l'a / l'as"),
  closed('ce-se', ['ce', 'se'], false, 'ce / se'),
  closed('ca-sa', ['ça', 'sa'], false, 'ça / sa'),
  closed('on-ont', ['on', 'ont'], true, 'on / ont'),
  closed('son-sont', ['son', 'sont'], true, 'son / sont'),
  closed('mon', ['mon', "m'ont"], true, "mon / m'ont"),
  closed('ton', ['ton', "t'ont"], true, "ton / t'ont"),
  closed('ma', ['ma', "m'a", "m'as"], false, "ma / m'a / m'as"),
  closed('ta', ['ta', "t'a", "t'as"], false, "ta / t'a / t'as"),
  closed('mes-mais', ['mes', 'mais', 'met', 'mets', "m'est"], true, "mes / mais / met / mets / m'est"),
  closed('peu', ['peu', 'peut', 'peux'], false, 'peu / peut / peux'),
  closed('leur', ['leur', 'leurs'], true, 'leur / leurs'),
  closed('quel', ['quel', 'quels', 'quelle', 'quelles', "qu'elle", "qu'elles"], true, "quel / quels / quelle / quelles / qu'elle(s)"),
  // "tous" as a pronoun ("ils sont tous là") ends in an audible [s]; as a determiner it does not.
  closed('tout', ['tout', 'tous'], true, 'tout / tous (as in "tous les jours")'),
  closed('au', ['au', 'aux'], true, 'au / aux'),
  closed('cet', ['cet', 'cette'], false, 'cet / cette'),
  closed('sans', ['sans', "s'en", 'cent', 'sang'], true, "sans / s'en / cent / sang"),
  closed('dans', ['dans', "d'en"], true, "dans / d'en"),
  closed('quand', ['quand', "qu'en", 'quant'], true, "quand / qu'en / quant"),
  closed('ni', ['ni', "n'y"], false, "ni / n'y"),
  closed('si', ['si', "s'y"], false, "si / s'y"),
]);

// ── pattern rules ──────────────────────────────────────────────────────────

/** "-ent" words where the ending is pronounced [ɑ̃] and the "-e" form is another real word. */
export const NON_VERB_ENT: readonly string[] = Object.freeze([
  'comment', 'content', 'parent', 'président', 'résident', 'violent', 'excellent', 'couvent',
  'souvent', 'moment', 'accent', 'argent', 'client', 'patient', 'talent', 'absent', 'présent',
  'récent', 'différent', 'intelligent', 'évident', 'prudent', 'urgent', 'adolescent', 'innocent',
  'équivalent', 'précédent', 'incident', 'accident', 'serpent', 'agent', 'sergent',
]);

/** "-er" words pronounced [ɛʁ], not [e]. */
export const AUDIBLE_ER: readonly string[] = Object.freeze([
  'cher', 'fer', 'mer', 'hier', 'hiver', 'super', 'enfer', 'amer', 'fier', 'ver', 'hamster',
  'laser', 'poster', 'cancer', 'master', 'revolver', 'cuiller', 'éther', 'jupiter', 'leader',
  'manager', 'scooter', 'poker', 'joker', 'bunker', 'starter', 'cluster', 'hacker', 'speaker',
]);

/** Words whose final -s / -x is pronounced, or whose base is a different-sounding word. */
export const AUDIBLE_FINAL_S: readonly string[] = Object.freeze([
  'fils', 'bus', 'plus', 'tous', 'sens', 'os', 'ours', 'mars', 'tennis', 'virus', 'bonus',
  'campus', 'cactus', 'autobus', 'terminus', 'hélas', 'maïs', 'oasis', 'iris', 'atlas', 'express',
  'dix', 'six', 'eux', 'as', 'jadis', 'gratis', 'mœurs', 'sus', 'lys', 'tournevis', 'vis',
]);

/** Two-letter bases that must not take a silent plural: le/les, de/des, … are audibly different (Category B). */
export const PLURAL_BASE_EXCLUDE: readonly string[] = Object.freeze(['le', 'de', 'ce', 'me', 'te', 'se', 'du', 'un']);

/** Words whose final -t is pronounced. */
export const AUDIBLE_FINAL_T: readonly string[] = Object.freeze([
  'but', 'huit', 'dot', 'mat', 'fat', 'brut', 'chut', 'net', 'zut', 'scout', 'rut', 'yaourt',
]);

const NON_VERB_ENT_SET = new Set(NON_VERB_ENT);
const AUDIBLE_ER_SET = new Set(AUDIBLE_ER);
const AUDIBLE_FINAL_S_SET = new Set(AUDIBLE_FINAL_S);
const PLURAL_BASE_EXCLUDE_SET = new Set(PLURAL_BASE_EXCLUDE);
const AUDIBLE_FINAL_T_SET = new Set(AUDIBLE_FINAL_T);

function stripEnding(word: string, endings: readonly string[]): { stem: string; ending: string } | null {
  for (const ending of endings) {
    if (word.length > ending.length && word.endsWith(ending)) {
      return { stem: word.slice(0, -ending.length), ending };
    }
  }
  return null;
}

/** P1 — present tense of -er verbs (and plural nouns in -e): mange / manges / mangent. */
const PRESENT_E_ENDINGS = ['ent', 'es', 'e'] as const;
function matchPresentE(a: string, b: string): boolean {
  if (NON_VERB_ENT_SET.has(a) || NON_VERB_ENT_SET.has(b)) return false;
  const x = stripEnding(a, PRESENT_E_ENDINGS);
  const y = stripEnding(b, PRESENT_E_ENDINGS);
  return !!x && !!y && x.ending !== y.ending && x.stem === y.stem && x.stem.length >= 3;
}

/** P2 — the [e]/[ɛ] verb endings: mangé / mangée(s) / mangés / manger / mangez / mangeais / mangeait / mangeaient. */
export const E_SOUND_ENDINGS = ['aient', 'ées', 'ais', 'ait', 'ée', 'és', 'er', 'ez', 'é'] as const;

/** Undo the spelling change before -a endings: mange-ait → mang, commenç-ait → commenc. */
export function eSoundStem(word: string): { stem: string; ending: string } | null {
  if (AUDIBLE_ER_SET.has(word)) return null;
  const s = stripEnding(word, E_SOUND_ENDINGS);
  if (!s) return null;
  let stem = s.stem;
  if (s.ending.startsWith('a')) {
    if (stem.endsWith('ge')) stem = stem.slice(0, -1);
    else if (stem.endsWith('ç')) stem = `${stem.slice(0, -1)}c`;
  }
  return stem.length >= 2 ? { stem, ending: s.ending } : null;
}

function matchESound(a: string, b: string): boolean {
  const x = eSoundStem(a);
  const y = eSoundStem(b);
  return !!x && !!y && x.ending !== y.ending && x.stem === y.stem;
}

/** P3 — silent plural -s / -x: chat / chats, jeu / jeux, an / ans. */
function matchSilentPlural(a: string, b: string): boolean {
  const [base, plural] = a.length < b.length ? [a, b] : [b, a];
  if (plural !== `${base}s` && plural !== `${base}x`) return false;
  if (base.length < 2 || PLURAL_BASE_EXCLUDE_SET.has(base) || /[sxz]$/.test(base)) return false;
  return !AUDIBLE_FINAL_S_SET.has(plural);
}

/** P4 — silent agreement -e after a vowel or an -l (ami / amie / amies, seul / seule, bel / belle, pareil / pareille). */
function stripPluralForAgreement(word: string): string {
  if (AUDIBLE_FINAL_S_SET.has(word)) return word;
  return /[sx]$/.test(word) && word.length > 2 ? word.slice(0, -1) : word;
}

function isAgreementPair(base: string, feminine: string): boolean {
  if (feminine === `${base}e`) {
    if (base.length >= 2 && /(?:é|i|u|ai|eu)$/.test(base)) return true;
    if (base.length >= 3 && base.endsWith('l')) return true;
  }
  return feminine === `${base}le` && /(?:el|ul|eil)$/.test(base);
}

function matchSilentAgreement(a: string, b: string): boolean {
  const x = stripPluralForAgreement(a);
  const y = stripPluralForAgreement(b);
  return isAgreementPair(x, y) || isAgreementPair(y, x);
}

/** P5 — silent final consonant of verb endings: fais / fait, finis / finit, viens / vient, peu / peut, par / part. */
function consonantStem(word: string): { stem: string; ending: string } {
  const m = /^(.+?)([stx]?)$/.exec(word)!;
  const ending = m[2];
  let stem = m[1];
  if (ending === 't') stem = stem.replace(/î$/, 'i');
  return { stem, ending };
}

function matchSilentConsonant(a: string, b: string): boolean {
  if (AUDIBLE_FINAL_T_SET.has(a) || AUDIBLE_FINAL_T_SET.has(b)) return false;
  if (AUDIBLE_FINAL_S_SET.has(a) || AUDIBLE_FINAL_S_SET.has(b)) return false;
  const x = consonantStem(a);
  const y = consonantStem(b);
  if (x.ending === y.ending || (x.ending !== 't' && y.ending !== 't')) return false;
  if (x.stem !== y.stem || x.stem.length < 2) return false;
  // The stem must end in a vowel (not a mute -e), an -r or an -n: sept, pied, huit-type words are out.
  return /(?:[aiouyéèêâôû]|[rn])$/.test(x.stem);
}

function pattern(
  id: string,
  description: string,
  liaisonSensitive: boolean,
  exclusions: readonly string[],
  match: (a: string, b: string) => boolean,
): PatternSoundClass {
  return Object.freeze({ kind: 'pattern' as const, id, description, liaisonSensitive, exclusions, match });
}

export const PATTERN_CLASSES: readonly PatternSoundClass[] = Object.freeze([
  pattern('present-e', 'Present tense -e / -es / -ent (il mange / ils mangent)', false, NON_VERB_ENT, matchPresentE),
  pattern('e-sound', 'Verb endings -é / -ée / -és / -ées / -er / -ez / -ais / -ait / -aient (mangé / manger / mangez / mangeait)', false, AUDIBLE_ER, matchESound),
  pattern('silent-plural', 'Silent plural -s / -x (chat / chats, jeu / jeux)', false, [...PLURAL_BASE_EXCLUDE, ...AUDIBLE_FINAL_S], matchSilentPlural),
  pattern('silent-agreement', 'Silent agreement -e (ami / amie, seul / seule, bel / belle)', false, AUDIBLE_FINAL_S, matchSilentAgreement),
  pattern('silent-consonant', 'Silent final -s / -t / -x (fais / fait, finis / finit, viens / vient)', false, [...AUDIBLE_FINAL_T, ...AUDIBLE_FINAL_S], matchSilentConsonant),
]);

// ── lookup ─────────────────────────────────────────────────────────────────

function closedClassOf(a: string, b: string): ClosedSoundClass | null {
  return CLOSED_CLASSES.find((c) => c.forms.includes(a) && c.forms.includes(b)) ?? null;
}

/**
 * The Category A class two written forms share, or null. Case, apostrophe
 * style and edge punctuation are ignored; identical forms return null (there
 * is no difference to classify). Does not look at the next word: use
 * `soundsIdenticalInContext` where a liaison could tell them apart.
 */
export function categoryAClass(a: string, b: string): SoundClass | null {
  const x = parseToken(a).lower;
  const y = parseToken(b).lower;
  if (!x || !y || x === y || /\s/.test(x) || /\s/.test(y)) return null;
  const whole = closedClassOf(x, y);
  if (whole) return whole;
  const ex = splitElision(x);
  const ey = splitElision(y);
  if (ex.prefix !== ey.prefix) return null;
  const inner = closedClassOf(ex.word, ey.word);
  if (inner) return inner;
  return PATTERN_CLASSES.find((c) => c.match(ex.word, ey.word)) ?? null;
}

/**
 * Whether the two forms sound the same where they stand: same Category A
 * class, and — for a liaison-sensitive class — not followed (without a
 * written pause) by a word starting with a vowel sound.
 */
export function soundsIdenticalInContext(a: string, b: string, next: string | undefined, pauseAfter: boolean): boolean {
  const cls = categoryAClass(a, b);
  if (!cls) return false;
  if (!cls.liaisonSensitive || pauseAfter || next === undefined) return true;
  return !startsWithVowelSound(normalizeWord(next));
}

/**
 * A quote and its correction differ only inside Category A classes: same
 * number of words, and each changed word sounds the same in its place.
 * Case and punctuation are ignored; an empty quote is never sound-identical.
 */
export function soundsIdentical(quote: string, correction: string): boolean {
  const q = tokenize(quote).filter((t) => t.lower);
  const c = tokenize(correction).filter((t) => t.lower);
  if (q.length === 0 || q.length !== c.length) return false;
  return q.every((t, i) => {
    if (t.lower === c[i].lower) return true;
    const pause = t.pauseAfter || c[i].pauseAfter;
    const nq = q[i + 1]?.lower;
    const nc = c[i + 1]?.lower;
    return soundsIdenticalInContext(t.lower, c[i].lower, nq, pause) && soundsIdenticalInContext(t.lower, c[i].lower, nc, pause);
  });
}
