/**
 * Closed word lists the respeller (`respell.ts`) needs. The respeller only
 * WRITES forms it can build from these lists, so a verb missing here is left
 * as heard — never guessed. (The sound classes in `classes.ts` need no list:
 * they only compare two spellings that already exist.)
 */

// ── -er verbs ──────────────────────────────────────────────────────────────

/** Common -er verbs (infinitives). Their present il/ils forms, participle, infinitive and -ez form all share a stem. */
const ER_INFINITIVES = [
  'accepter', 'accompagner', 'acheter', 'adorer', 'aider', 'aimer', 'aller', 'améliorer', 'amener',
  'amuser', 'appeler', 'apporter', 'apprécier', 'arrêter', 'arriver', 'attraper', 'baigner',
  'bavarder', 'blesser', 'bouger', 'bronzer', 'brosser', 'calmer', 'camper', 'casser', 'célébrer',
  'changer', 'chanter', 'chatter', 'chercher', 'cliquer', 'commander', 'commencer', 'compter',
  'consommer', 'continuer', 'copier', 'corriger', 'coucher', 'coûter', 'créer', 'cuisiner',
  'danser', 'décider', 'déjeuner', 'demander', 'déménager', 'dépêcher', 'dépenser', 'dessiner',
  'détester', 'dîner', 'discuter', 'disputer', 'donner', 'doucher', 'durer', 'économiser',
  'embrasser', 'emmener', 'emporter', 'emprunter', 'encourager', 'énerver', 'enseigner',
  'entraîner', 'entrer', 'envoyer', 'espérer', 'essayer', 'étudier', 'excuser', 'expliquer',
  'explorer', 'fabriquer', 'fatiguer', 'féliciter', 'fermer', 'fêter', 'fumer', 'gagner', 'garder',
  'garer', 'gaspiller', 'gérer', 'goûter', 'grignoter', 'grimper', 'habiller', 'habiter',
  'imaginer', 'informer', 'inquiéter', 'installer', 'intéresser', 'inviter', 'jeter', 'jouer',
  'lancer', 'laisser', 'laver', 'lever', 'livrer', 'louer', 'manger', 'manquer', 'maquiller',
  'marcher', 'mélanger', 'mener', 'monter', 'montrer', 'nager', 'nettoyer', 'noter', 'occuper',
  'organiser', 'oublier', 'pardonner', 'parler', 'participer', 'partager', 'passer', 'patiner',
  'payer', 'pêcher', 'penser', 'piloter', 'plonger', 'polluer', 'porter', 'poster', 'pousser',
  'pratiquer', 'préférer', 'préparer', 'présenter', 'prêter', 'prier', 'profiter', 'promener',
  'protéger', 'quitter', 'raconter', 'ramener', 'ranger', 'rappeler', 'recycler', 'refuser',
  'regarder', 'regretter', 'remercier', 'rencontrer', 'rentrer', 'répéter', 'reposer',
  'représenter', 'réserver', 'respecter', 'respirer', 'ressembler', 'rester', 'retourner',
  'retrouver', 'réveiller', 'rêver', 'réviser', 'saluer', 'sauver', 'sécher', 'sembler', 'skier',
  'soigner', 'sonner', 'souhaiter', 'stresser', 'surfer', 'taper', 'télécharger', 'téléphoner',
  'terminer', 'tirer', 'tomber', 'tourner', 'travailler', 'traverser', 'trier', 'trouver',
  'utiliser', 'vérifier', 'visiter', 'voler', 'voyager',
] as const;

/** Present il-form where the stem changes (boot verbs). Default: infinitive stem + "e". */
const BOOT_PRESENT: Readonly<Record<string, string>> = {
  acheter: 'achète', amener: 'amène', emmener: 'emmène', lever: 'lève', mener: 'mène',
  promener: 'promène', ramener: 'ramène', célébrer: 'célèbre', espérer: 'espère', gérer: 'gère',
  inquiéter: 'inquiète', préférer: 'préfère', protéger: 'protège', répéter: 'répète',
  sécher: 'sèche', appeler: 'appelle', rappeler: 'rappelle', jeter: 'jette', envoyer: 'envoie',
  essayer: 'essaie', nettoyer: 'nettoie', payer: 'paie',
};

/** Verbs that are not -er but whose present tense still ends -e / -es / -ent (present only). */
export const PRESENT_ONLY = ['ouvre', 'offre', 'couvre', 'découvre', 'souffre', 'cueille', 'accueille'] as const;

/** -er infinitives whose present tense is irregular (no -e / -ent forms to build). */
const NO_REGULAR_PRESENT = new Set(['aller']);

export interface ErVerb {
  readonly infinitive: string;
  /** "mang" — participle, infinitive and -ez form are built on it. */
  readonly infStem: string;
  /** "mang", "achèt", "appell" — present -e / -es / -ent forms are built on it; null if irregular. */
  readonly presStem: string | null;
}

export const ER_VERBS: readonly ErVerb[] = ER_INFINITIVES.map((infinitive) => {
  const infStem = infinitive.slice(0, -2);
  const present = NO_REGULAR_PRESENT.has(infinitive) ? null : (BOOT_PRESENT[infinitive] ?? `${infStem}e`);
  return Object.freeze({ infinitive, infStem, presStem: present ? present.slice(0, -1) : null });
});

const BY_INF_STEM = new Map(ER_VERBS.map((v) => [v.infStem, v]));
const PRESENT_STEMS = new Set<string>([
  ...ER_VERBS.flatMap((v) => (v.presStem ? [v.presStem] : [])),
  ...PRESENT_ONLY.map((w) => w.slice(0, -1)),
]);

/** The -er verb whose infinitive stem this is ("mang" → manger), or null. */
export function erVerbByInfStem(stem: string): ErVerb | null {
  return BY_INF_STEM.get(stem) ?? null;
}

/** Whether "<stem>e" / "<stem>ent" are a known present tense (mange / mangent, achète / achètent). */
export function isKnownPresentStem(stem: string): boolean {
  return PRESENT_STEMS.has(stem);
}

// ── other verbs ────────────────────────────────────────────────────────────

/** Present tense pairs [je/tu form, il/elle form] that sound the same. Their ils-form is audibly different. */
export const CONSONANT_VERB_PAIRS: readonly (readonly [string, string])[] = Object.freeze([
  ['fais', 'fait'], ['peux', 'peut'], ['veux', 'veut'], ['dois', 'doit'], ['sais', 'sait'],
  ['dis', 'dit'], ['lis', 'lit'], ['écris', 'écrit'], ['mets', 'met'], ['prends', 'prend'],
  ['comprends', 'comprend'], ['apprends', 'apprend'], ['finis', 'finit'], ['choisis', 'choisit'],
  ['réussis', 'réussit'], ['grandis', 'grandit'], ['remplis', 'remplit'], ['réfléchis', 'réfléchit'],
  ['sors', 'sort'], ['pars', 'part'], ['dors', 'dort'], ['sers', 'sert'], ['vis', 'vit'],
  ['bois', 'boit'], ['reçois', 'reçoit'], ['connais', 'connaît'], ['viens', 'vient'],
  ['tiens', 'tient'], ['deviens', 'devient'], ['reviens', 'revient'], ['vends', 'vend'],
  ['attends', 'attend'], ['réponds', 'répond'], ['entends', 'entend'], ['perds', 'perd'],
  ['descends', 'descend'], ['bats', 'bat'], ['permets', 'permet'], ['promets', 'promet'],
  ['conduis', 'conduit'], ['construis', 'construit'], ['produis', 'produit'], ['plais', 'plaît'],
  ['crois', 'croit'], ['vois', 'voit'],
]);

/** Pairs above whose ils-form sounds like the il-form (croient, voient): no number evidence. */
const SAME_SOUND_PLURAL = new Set(['crois', 'croit', 'vois', 'voit']);

/** Verb forms after il/elle that are audibly singular (their ils-form sounds different). */
export const AUDIBLE_SINGULAR: ReadonlySet<string> = new Set([
  'est', 'a', 'va', 'faut', 'pleut', 'ai', 'ira',
  ...CONSONANT_VERB_PAIRS.flat().filter((w) => !SAME_SOUND_PLURAL.has(w)),
]);

/** Verb forms after ils/elles that are audibly plural. */
export const AUDIBLE_PLURAL: ReadonlySet<string> = new Set([
  'sont', 'ont', 'vont', 'font', 'iront', 'peuvent', 'veulent', 'doivent', 'savent', 'disent',
  'lisent', 'écrivent', 'mettent', 'prennent', 'comprennent', 'apprennent', 'finissent',
  'choisissent', 'réussissent', 'grandissent', 'remplissent', 'réfléchissent', 'sortent',
  'partent', 'dorment', 'servent', 'vivent', 'boivent', 'reçoivent', 'connaissent', 'viennent',
  'tiennent', 'deviennent', 'reviennent', 'vendent', 'attendent', 'répondent', 'entendent',
  'perdent', 'descendent', 'battent', 'permettent', 'promettent', 'conduisent', 'construisent',
  'produisent', 'plaisent', 'suivent',
]);

/** -ais / -ait forms that are present tense, not imperfect: never build an "-aient" from them. */
export const NOT_IMPERFECT: ReadonlySet<string> = new Set([
  'connais', 'connait', 'reconnais', 'reconnait', 'parais', 'parait', 'apparais', 'apparait',
  'disparais', 'disparait', 'plais', 'plait', 'déplais', 'déplait', 'nais', 'nait', 'renais',
  'renait', 'fais', 'fait', 'refais', 'refait', 'défais', 'défait', 'satisfais', 'satisfait',
  'trais', 'trait', 'extrais', 'extrait', 'distrais', 'distrait', 'sais', 'sait', 'vais', 'mais',
  'jamais', 'souhait', 'lait', 'vrai', 'vrais',
]);

// ── function words ─────────────────────────────────────────────────────────

export const SUBJECT_PRONOUNS: ReadonlySet<string> = new Set(['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']);

/** Standalone object pronouns / negation that may sit between a subject and its verb. */
export const CLITICS: ReadonlySet<string> = new Set(['ne', 'me', 'te', 'se', 'le', 'la', 'les', 'lui', 'leur', 'y', 'en', 'nous', 'vous']);

export const AUX_AVOIR: ReadonlySet<string> = new Set([
  'ai', 'as', 'a', 'avons', 'avez', 'ont', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aurai',
  'auras', 'aura', 'aurons', 'aurez', 'auront', 'aurais', 'aurait', 'aurions', 'auriez',
  'auraient', 'avoir', 'ayant',
]);

export const AUX_ETRE: ReadonlySet<string> = new Set([
  'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était', 'étions', 'étiez', 'étaient',
  'serai', 'seras', 'sera', 'serons', 'serez', 'seront', 'serais', 'serait', 'serions', 'seriez',
  'seraient', 'être', 'étant',
]);

/** Words directly followed by an infinitive (modal / liking verbs, prepositions). */
export const INFINITIVE_TRIGGERS: ReadonlySet<string> = new Set([
  'pour', 'de', 'à', 'sans',
  'vais', 'vas', 'va', 'allons', 'allez', 'vont', 'allais', 'allait', 'allaient',
  'veux', 'veut', 'voulons', 'voulez', 'veulent', 'voudrais', 'voudrait', 'voudrions', 'voudriez', 'voudraient',
  'peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'pourrais', 'pourrait', 'pourrions', 'pourriez', 'pourraient',
  'dois', 'doit', 'devons', 'devez', 'doivent', 'devrais', 'devrait', 'devrions', 'devriez', 'devraient',
  'aime', 'aimes', 'aiment', 'aimons', 'aimez', 'aimerais', 'aimerait', 'aimerions', 'aimeriez', 'aimeraient',
  'adore', 'adores', 'adorent', 'déteste', 'détestes', 'détestent',
  'préfère', 'préfères', 'préfèrent', 'préférerais', 'préférerait',
  'espère', 'espères', 'espèrent', 'faut', 'sais', 'sait', 'savent', 'fais', 'fait', 'font',
]);

/** Adverbs / negation allowed between an auxiliary or trigger and the verb it governs. */
export const VERB_ADVERBS: ReadonlySet<string> = new Set([
  'pas', 'jamais', 'plus', 'rien', 'déjà', 'bien', 'beaucoup', 'souvent', 'toujours', 'encore',
  'aussi', 'vraiment', 'trop', 'tout', 'enfin', 'finalement', 'même', 'peut-être',
]);

/** Object pronouns allowed between an infinitive trigger and the infinitive. le / la / les are left out: they are also articles. */
export const INFINITIVE_CLITICS: ReadonlySet<string> = new Set(['me', 'te', 'se', 'lui', 'y', 'nous', 'vous']);

/** Nouns spelt like the participle of a listed verb: never turned into an infinitive. */
export const PARTICIPLE_NOUNS: ReadonlySet<string> = new Set([
  'marché', 'passé', 'arrivée', 'entrée', 'pensée', 'fumée', 'traversée', 'tournée', 'montée',
  'durée', 'monté', 'parlé', 'reposé', 'rangée', 'levée', 'louée',
]);

/** Prepositions / verbs after which "a" can only be the preposition "à". */
export const A_GRAVE_AFTER: ReadonlySet<string> = new Set([
  'vais', 'vas', 'va', 'allons', 'allez', 'vont', 'aller', 'allé', 'allée', 'allés', 'allées',
  'allais', 'allait', 'allaient', 'irai', 'iras', 'ira', 'irons', 'irez', 'iront',
  'habite', 'habites', 'habitons', 'habitez', 'habitent', 'habiter', 'habité',
  'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était', 'étaient', 'été',
  'reste', 'restes', 'restent', 'rester', 'resté', 'arrive', 'arrives', 'arrivent', 'arriver', 'arrivé',
  'commence', 'commences', 'commencent', 'commencer', 'commencé',
  'joue', 'joues', 'jouons', 'jouez', 'jouent', 'jouer', 'joué',
  'pense', 'penses', 'pensent', 'penser', 'pensé', 'apprends', 'apprend', 'apprendre', 'appris',
  'aide', 'aides', 'aident', 'aider', 'aidé', 'travaille', 'travailles', 'travaillent', 'travailler',
  'téléphone', 'téléphoner', 'parle', 'parles', 'parlent', 'parler', 'parlé',
  'jusqu', 'grâce', 'face', 'quant',
]);

/** Words after which "a" + this word is the preposition: à côté, à cause, à pied … */
export const A_GRAVE_BEFORE: ReadonlySet<string> = new Set([
  'côté', 'cause', 'pied', 'vélo', 'partir', 'peu', 'bientôt', 'midi', 'minuit', 'demain', 'part',
]);

export const POSSESSIVES: ReadonlySet<string> = new Set(['mon', 'ton', 'son', 'notre', 'votre', 'leur']);

// ── number markers ─────────────────────────────────────────────────────────

export type Gender = 'm' | 'f' | '?';

export const SINGULAR_DETERMINERS: ReadonlyMap<string, Gender> = new Map<string, Gender>([
  ['un', 'm'], ['le', 'm'], ['mon', 'm'], ['ton', 'm'], ['son', 'm'], ['ce', 'm'], ['cet', 'm'],
  ['une', 'f'], ['la', 'f'], ['ma', 'f'], ['ta', 'f'], ['sa', 'f'], ['cette', 'f'],
  ['notre', '?'], ['votre', '?'], ['chaque', '?'],
]);

export const PLURAL_NUMBERS: ReadonlySet<string> = new Set([
  'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
  'cent', 'mille',
]);

/** Always-plural determiners (never pronouns). "les" is handled separately: it is also a pronoun. */
export const PLURAL_DETERMINERS: ReadonlySet<string> = new Set([
  'des', 'mes', 'tes', 'ses', 'nos', 'vos', 'ces', 'leurs', 'plusieurs', 'quelques', ...PLURAL_NUMBERS,
]);

/** Adjectives that come before the noun, so the plural carries on to the next word. */
export const PRENOMINAL_ADJECTIVES: ReadonlySet<string> = new Set([
  'petit', 'grand', 'bon', 'beau', 'jeune', 'nouveau', 'gros', 'joli', 'mauvais', 'autre',
  'premier', 'dernier', 'meilleur', 'vrai', 'haut', 'petite', 'grande', 'bonne', 'belle',
  'nouvelle', 'grosse', 'jolie', 'mauvaise', 'première', 'dernière', 'meilleure', 'vraie', 'haute',
]);

/** -ou nouns with an -x plural. */
export const OU_X_PLURALS: ReadonlySet<string> = new Set(['bijou', 'caillou', 'chou', 'genou', 'hibou', 'joujou', 'pou']);
/** -eu nouns with an -s plural. */
export const EU_S_PLURALS: ReadonlySet<string> = new Set(['bleu', 'pneu', 'émeu']);

/** Words never pluralised by the determiner rule (function words, adverbs, invariable words). */
export const NOT_PLURALISED: ReadonlySet<string> = new Set([
  ...SUBJECT_PRONOUNS, ...CLITICS, ...AUX_AVOIR, ...AUX_ETRE, ...PLURAL_DETERMINERS, ...VERB_ADVERBS,
  'et', 'ou', 'mais', 'donc', 'car', 'que', 'qui', 'quoi', 'dont', 'où', 'si', 'très', 'assez',
  'peu', 'moins', 'autres', 'de', 'du', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'sous', 'avec',
  'pour', 'par', 'sans', 'chez', 'vers', 'entre', 'pendant', 'depuis', 'avant', 'après', 'comme',
  'le', 'la', 'les', 'un', 'une', 'ce', 'cet', 'cette', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
  'notre', 'votre', 'leur', 'chaque', 'tout', 'toute', 'toutes', 'tous', 'quel', 'quelle', 'ça',
  'cela', 'ceci', 'moi', 'toi', 'soi', 'eux', 'ici', 'là', 'oui', 'non', 'ne', 'n', 'personne',
  'gens', 'fois',
]);
