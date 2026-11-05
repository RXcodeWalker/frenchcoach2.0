/**
 * Learn's confirm screen asks the student only when the two recognisers
 * really might have heard different words. Some disagreements are the same
 * sound split two ways, and the sentence already says which one it is:
 *
 *  - « m'encourage à étudier » and « mon courage à étudier » are the same
 *    nasal. Only the verb can govern « à » + infinitive.
 *  - « de bonnes notes » and « des bonnes notes ». « des » cannot stand
 *    in front of an adjective; the grammar is « de ».
 *
 * Those are not offered as a choice. The reading that fits is what the
 * student sees, and confirming it is not an edit. A disagreement that could
 * still go either way (ont / sont, un / en, poisson / poison, « de sciences »
 * after a noun) is left underlined.
 *
 * The exam marker does not use this. `alignRecognisers` stays the one
 * definition of "do these transcripts agree", and Category B words stay
 * uncertain for the judge. This file is the confirm screen's policy on top.
 */

import {
  AUX_AVOIR,
  AUX_ETRE,
  AUDIBLE_PLURAL,
  AUDIBLE_SINGULAR,
  ER_VERBS,
  INFINITIVE_PREPOSITIONS,
  INFINITIVE_TRIGGERS,
  NOT_PLURALISED,
  PRENOMINAL_ADJECTIVES,
  PRESENT_ONLY,
  SUBJECT_PRONOUNS,
  VERB_ADVERBS,
} from '../igcse/stt/homophones/lexicon';
import { AUDIBLE_FINAL_S } from '../igcse/stt/homophones/classes';
import { nearPairOf } from '../igcse/stt/homophones/nearPairs';
import { startsWithVowelSound, tokenize, type Token } from '../igcse/stt/homophones/text';
import { alignRecognisers, applyAlternatives, swappedWords, type AlignedSpan, type RecogniserAlignment } from './alignRecognisers';

const SUBJECTS: ReadonlySet<string> = new Set([...SUBJECT_PRONOUNS, 'ça', 'cela', 'ceci', 'qui']);

/** Immediately before a noun, never before a finite verb. */
const NOUN_INTRODUCERS: ReadonlySet<string> = new Set([
  "c'est", 'voici', 'voilà', 'avec', 'dans', 'sur', 'sous', 'chez', 'contre', 'malgré',
  'après', 'avant', 'entre', 'pour', 'sans', 'parmi', 'selon', 'pendant',
]);

/** Negation and quantity take « de », never « des » / « du ». */
const DE_TRIGGERS: ReadonlySet<string> = new Set([
  'pas', 'plus', 'jamais', 'rien', 'personne', 'aucun', 'aucune', 'guère', 'point',
  'beaucoup', 'peu', 'assez', 'trop', 'moins', 'davantage', 'tant', 'autant', 'énormément', 'plein',
]);

/** Sits between « de » and the adjective: « de très bonnes notes ». */
const INTENSIFIERS: ReadonlySet<string> = new Set(['très', 'vraiment', 'si', 'plutôt', 'tellement', 'fort']);

const IRREGULAR_INFINITIVES: ReadonlySet<string> = new Set([
  'être', 'avoir', 'faire', 'aller', 'dire', 'lire', 'écrire', 'prendre', 'comprendre', 'apprendre',
  'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir', 'venir', 'tenir', 'devenir', 'revenir', 'sortir',
  'partir', 'dormir', 'finir', 'choisir', 'réussir', 'mettre', 'boire', 'connaître', 'connaitre',
  'vivre', 'suivre', 'ouvrir', 'offrir', 'recevoir', 'attendre', 'répondre', 'entendre', 'perdre',
  'descendre', 'vendre', 'conduire', 'construire', 'produire', 'croire',
]);

const IRREGULAR_PARTICIPLES: ReadonlySet<string> = new Set([
  'été', 'eu', 'fait', 'dite', 'dit', 'pris', 'prise', 'mis', 'mise', 'vu', 'vue', 'pu', 'su', 'voulu',
  'voulue', 'dû', 'due', 'ouvert', 'ouverte', 'écrit', 'écrite', 'lu', 'lue', 'bu', 'bue', 'connu',
  'connue', 'suivi', 'suivie', 'tenu', 'tenue', 'obtenu', 'obtenue', 'devenu', 'devenue', 'reçu',
  'reçue', 'venu', 'venue', 'couru', 'mort', 'morte', 'né', 'née',
]);

/**
 * Singulars that already end in -s, so a trailing -s is not a plural.
 * « des cours » is real, but so is « un cours »; guessing would be wrong.
 */
const NOT_A_PLURAL: ReadonlySet<string> = new Set([
  ...AUDIBLE_FINAL_S,
  'temps', 'corps', 'poids', 'repas', 'pays', 'cours', 'concours', 'secours', 'succès', 'progrès',
  'accès', 'procès', 'univers', 'parcours', 'discours', 'fois', 'mois', 'bras', 'bois', 'fils',
]);

const EXTRA_PRENOMINAL = [
  'vieux', 'vieil', 'vieille', 'long', 'longue', 'court', 'courte', 'bel', 'nouvel',
  'nombreux', 'nombreuse', 'faux', 'fausse', 'prochain', 'prochaine', 'seul', 'seule',
  'tel', 'telle', 'certain', 'certaine',
] as const;

/** One written form is both singular and plural, so it cannot choose ce/ces or le/les. */
const AMBIGUOUS_PRENOMINAL = new Set(['gros', 'vieux', 'gras']);

type PrenominalNumber = 'sg' | 'pl' | 'either';

const PRENOMINAL = buildPrenominals();

function pluralOf(base: string): string {
  if (base === 'beau' || base === 'bel') return 'beaux';
  if (base === 'nouveau' || base === 'nouvel') return 'nouveaux';
  if (base === 'vieil') return 'vieux';
  if (AMBIGUOUS_PRENOMINAL.has(base) || base.endsWith('s') || base.endsWith('x')) return base;
  if (base.endsWith('al')) return `${base.slice(0, -2)}aux`;
  return `${base}s`;
}

function buildPrenominals(): { form: ReadonlyMap<string, PrenominalNumber> } {
  const sg = new Set<string>();
  const pl = new Set<string>();
  const either = new Set<string>(AMBIGUOUS_PRENOMINAL);
  for (const base of [...PRENOMINAL_ADJECTIVES, ...EXTRA_PRENOMINAL]) {
    const plural = pluralOf(base);
    if (plural === base || AMBIGUOUS_PRENOMINAL.has(base) || AMBIGUOUS_PRENOMINAL.has(plural)) {
      either.add(base);
      either.add(plural);
      continue;
    }
    sg.add(base);
    pl.add(plural);
  }
  for (const word of either) {
    sg.delete(word);
    pl.delete(word);
  }
  const form = new Map<string, PrenominalNumber>();
  for (const word of sg) form.set(word, 'sg');
  for (const word of pl) if (!form.has(word)) form.set(word, 'pl');
  for (const word of either) form.set(word, 'either');
  return { form };
}

function prenominal(word: string): PrenominalNumber | null {
  return PRENOMINAL.form.get(word) ?? null;
}

function isFiniteVerb(word: string): boolean {
  if (AUX_AVOIR.has(word) || AUX_ETRE.has(word) || AUDIBLE_SINGULAR.has(word) || AUDIBLE_PLURAL.has(word)) return true;
  if ((PRESENT_ONLY as readonly string[]).includes(word)) return true;
  return ER_VERBS.some((v) => v.presStem !== null && (
    word === `${v.presStem}e` || word === `${v.presStem}es` || word === `${v.presStem}ent`
  ));
}

function isInfinitive(word: string): boolean {
  return IRREGULAR_INFINITIVES.has(word) || ER_VERBS.some((v) => v.infinitive === word);
}

function isParticiple(word: string): boolean {
  if (IRREGULAR_PARTICIPLES.has(word)) return true;
  return ER_VERBS.some((v) => {
    const stem = v.infStem;
    return word === `${stem}é` || word === `${stem}ée` || word === `${stem}és` || word === `${stem}ées`;
  });
}

function isVerbal(word: string): boolean {
  return isFiniteVerb(word) || isInfinitive(word) || isParticiple(word);
}

/** « notes » is the tu-form of noter and the plural of note. The closed lists are verbs only. */
function isClosedVerb(word: string): boolean {
  return AUX_AVOIR.has(word) || AUX_ETRE.has(word) || AUDIBLE_SINGULAR.has(word) || AUDIBLE_PLURAL.has(word)
    || (PRESENT_ONLY as readonly string[]).includes(word)
    || IRREGULAR_INFINITIVES.has(word) || IRREGULAR_PARTICIPLES.has(word);
}

function isErTuForm(word: string): boolean {
  return ER_VERBS.some((v) => v.presStem !== null && word === `${v.presStem}es`);
}

function looksPluralNoun(word: string): boolean {
  if (prenominal(word) || NOT_A_PLURAL.has(word) || NOT_PLURALISED.has(word) || isClosedVerb(word)) return false;
  if (word.length < 4) return false;
  return /[sx]$/.test(word);
}

function cores(text: string): string[] {
  return tokenize(text).map((t) => t.lower).filter(Boolean);
}

function single(text: string): string | null {
  const words = cores(text);
  return words.length === 1 ? words[0] : null;
}

function contentWord(next: readonly Token[]): Token | undefined {
  if (next.length === 0) return undefined;
  if (INTENSIFIERS.has(next[0].lower) && !next[0].pauseAfter && next[1]) return next[1];
  return next[0];
}

/** A subject pronoun a few words back, with only adverbs in between (« il toujours … »). */
function subjectBefore(tokens: readonly Token[], spanStart: number): boolean {
  let skipped = 0;
  for (let i = spanStart - 1; i >= 0 && skipped <= 3; i -= 1) {
    const token = tokens[i];
    if (token.endsSentence) return false;
    if (SUBJECTS.has(token.lower) || SUBJECTS.has(token.word)) return true;
    if (!VERB_ADVERBS.has(token.lower) || token.pauseAfter) return false;
    skipped += 1;
  }
  return false;
}

function wordBefore(tokens: readonly Token[], spanStart: number): Token | undefined {
  const token = spanStart > 0 ? tokens[spanStart - 1] : undefined;
  if (!token || token.endsSentence) return undefined;
  return token;
}

function infinitiveAfter(next: readonly Token[], prep: 'à' | 'de'): boolean {
  if (next.length < 2) return false;
  if (next[0].lower !== prep || next[0].pauseAfter) return false;
  return isInfinitive(next[1].word || next[1].lower);
}

/** « m'encourage » against « mon courage »: the nasal of « en- » is « mon ». */
function nasalSplit(verbWord: string, noun: string): boolean {
  const match = /^(en|em|an|am)([^aeiouyàâäéèêëîïôöùûüœæh'].+)$/.exec(verbWord);
  return match !== null && match[2] === noun && noun.length >= 2;
}

interface NasalPair {
  readonly verbSide: 'primary' | 'secondary';
  readonly verbWord: string;
  readonly nounWord: string;
}

function asNasal(verbText: string, nounText: string): { verbWord: string; nounWord: string } | null {
  const verbTokens = tokenize(verbText);
  const nounTokens = tokenize(nounText);
  if (verbTokens.length !== 1 || nounTokens.length !== 2) return null;
  const verb = verbTokens[0];
  if (!/^[mts]'$/.test(verb.prefix)) return null;
  const clitic: Readonly<Record<string, string>> = { mon: 'm', ton: 't', son: 's' };
  if (clitic[nounTokens[0].lower] !== verb.prefix[0]) return null;
  const nounWord = nounTokens[1].lower;
  if (!nasalSplit(verb.word, nounWord)) return null;
  return { verbWord: verb.word, nounWord };
}

function matchNasal(span: AlignedSpan): NasalPair | null {
  const primaryVerb = asNasal(span.primaryWords, span.secondaryWords);
  if (primaryVerb) return { verbSide: 'primary', ...primaryVerb };
  const secondaryVerb = asNasal(span.secondaryWords, span.primaryWords);
  if (secondaryVerb) return { verbSide: 'secondary', ...secondaryVerb };
  return null;
}

function nasalWinner(tokens: readonly Token[], span: AlignedSpan, pair: NasalPair): 'primary' | 'secondary' | null {
  const next = tokens.slice(span.end);
  const before = wordBefore(tokens, span.start);
  const finite = isFiniteVerb(pair.verbWord);
  const infinitive = isInfinitive(pair.verbWord);
  const aInf = infinitiveAfter(next, 'à');
  const governed = !!before && (INFINITIVE_PREPOSITIONS.has(before.lower) || INFINITIVE_TRIGGERS.has(before.lower));
  const verbFits = (finite && (subjectBefore(tokens, span.start) || aInf)) || (infinitive && (governed || aInf));

  const nounIsVerb = isFiniteVerb(pair.nounWord) || isInfinitive(pair.nounWord) || isParticiple(pair.nounWord);
  const introducer = !!before && NOUN_INTRODUCERS.has(before.lower);
  const nextVerb = next[0] && (
    (next[0].prefix !== '' && isFiniteVerb(next[0].word)) || isFiniteVerb(next[0].lower)
  );
  const nounFits = !nounIsVerb && (introducer || (!subjectBefore(tokens, span.start) && !!nextVerb) || infinitiveAfter(next, 'de'));

  if (verbFits === nounFits) return null;
  const verbSide = pair.verbSide;
  const nounSide = verbSide === 'primary' ? 'secondary' : 'primary';
  return verbFits ? verbSide : nounSide;
}

function deOrDes(before: Token | undefined, next: readonly Token[]): 'de' | 'des' | null {
  if (before && DE_TRIGGERS.has(before.lower)) return 'de';
  const content = contentWord(next);
  if (!content) return null;
  const kind = prenominal(content.lower);
  if (kind) return startsWithVowelSound(content.lower) ? 'des' : 'de';
  if (startsWithVowelSound(content.lower)) return 'des';
  if (before && isVerbal(before.lower) && looksPluralNoun(content.lower)) return 'des';
  return null;
}

function deOrDu(before: Token | undefined, next: readonly Token[]): 'de' | 'du' | null {
  if (before && DE_TRIGGERS.has(before.lower)) return 'de';
  const content = contentWord(next);
  if (!content) return null;
  const kind = prenominal(content.lower);
  if (kind === 'pl') return 'de';
  if (before && isVerbal(before.lower) && !kind && !startsWithVowelSound(content.lower) && !looksPluralNoun(content.lower)) {
    return 'du';
  }
  return null;
}

function ceOrCes(next: readonly Token[]): 'ce' | 'ces' | null {
  const content = contentWord(next);
  if (!content) return null;
  if (startsWithVowelSound(content.lower)) return 'ces';
  const kind = prenominal(content.lower);
  if (kind === 'pl') return 'ces';
  if (kind === 'sg') return 'ce';
  if (!kind && looksPluralNoun(content.lower)) return 'ces';
  return null;
}

function leOrLes(next: readonly Token[]): 'le' | 'les' | null {
  const content = contentWord(next);
  if (!content || startsWithVowelSound(content.lower)) return null;
  const kind = prenominal(content.lower);
  if (kind === 'pl') return 'les';
  if (kind === 'sg') return 'le';
  if (!kind && looksPluralNoun(content.lower)) return 'les';
  return null;
}

function cliticOrPossessive(clitic: string, possessive: string, next: readonly Token[], verbSlot: boolean): string | null {
  const content = contentWord(next);
  if (!content) return null;
  const word = content.prefix ? content.word : content.lower;
  const kind = prenominal(word);
  // « mes notes » is the noun. « tu te notes » is also a real verb, so that one stays a question.
  if (kind === 'pl' || (!kind && looksPluralNoun(word))) {
    if (clitic === 'te' && isErTuForm(word) && verbSlot) return null;
    return possessive;
  }
  if (content.prefix !== '' && isFiniteVerb(content.word)) return clitic;
  if (isVerbal(word)) return clitic;
  return null;
}

type Side = 'primary' | 'secondary';

function functionWordWinner(tokens: readonly Token[], span: AlignedSpan): Side | null {
  const primary = single(span.primaryWords);
  const secondary = single(span.secondaryWords);
  if (!primary || !secondary) return null;
  const pair = nearPairOf(primary, secondary);
  if (!pair) return null;
  const before = wordBefore(tokens, span.start);
  const next = tokens.slice(span.end);
  const key = [pair.a, pair.b].sort().join('~');
  let forced: string | null = null;
  if (key === 'de~des') forced = deOrDes(before, next);
  else if (key === 'de~du') forced = deOrDu(before, next);
  else if (key === 'ce~ces') forced = ceOrCes(next);
  else if (key === 'le~les') forced = leOrLes(next);
  else if (key === 'me~mes') forced = cliticOrPossessive('me', 'mes', next, subjectBefore(tokens, span.start));
  else if (key === 'se~ses') forced = cliticOrPossessive('se', 'ses', next, subjectBefore(tokens, span.start));
  else if (key === 'te~tes') forced = cliticOrPossessive('te', 'tes', next, subjectBefore(tokens, span.start));
  if (forced === primary) return 'primary';
  if (forced === secondary) return 'secondary';
  return null;
}

function winningSide(alignment: RecogniserAlignment, span: AlignedSpan): Side | null {
  if (!span.swappable) return null;
  const tokens = tokenize(alignment.primaryText);
  const nasal = matchNasal(span);
  if (nasal) return nasalWinner(tokens, span, nasal);
  return functionWordWinner(tokens, span);
}

/**
 * The alignment the confirm screen shows. Readings the sentence settles are
 * already written into `primaryText` and removed from `spans`.
 */
export function resolveObviousHearings(primary: string, secondary: string): RecogniserAlignment {
  const alignment = alignRecognisers(primary, secondary, { spokenNumbers: true });
  const drop = new Set<number>();
  const swap = new Set<number>();
  alignment.spans.forEach((span, index) => {
    const side = winningSide(alignment, span);
    if (side === 'primary') drop.add(index);
    else if (side === 'secondary') {
      drop.add(index);
      swap.add(index);
    }
  });
  if (drop.size === 0) return alignment;

  const text = applyAlternatives(alignment, swap);
  let delta = 0;
  const spans: AlignedSpan[] = [];
  alignment.spans.forEach((span, index) => {
    if (swap.has(index)) {
      const swapped = swappedWords(alignment, index);
      delta += tokenize(swapped ?? '').length - (span.end - span.start);
      return;
    }
    if (drop.has(index)) return;
    spans.push({ ...span, start: span.start + delta, end: span.end + delta });
  });
  return { ...alignment, primaryText: text, spans };
}
