/**
 * Offline coach, second rule set: the common IGCSE speaking slips the first 22
 * rules missed — être verbs with avoir beyond « j'ai allé », determiner gender
 * on everyday nouns (« mon mère », « la sport »), adjective agreement after
 * être, the dropped « ne » in « c'est pas », « si » + conditional, « en » vs
 * « à » with countries and cities, verbs that take no « de » before an
 * infinitive, missing reflexive pronouns, jouer à / jouer de, and a few
 * English calques.
 *
 * Precision first: a false correction is worse than a missing one (docs Stage
 * 4 preamble), so every rule works from a closed word list and guards the
 * contexts where the same words are correct (« il la regarde », « je ne sais
 * pas si je pourrais », « elle est grand-mère »). Every rule has FIRE and SILENT
 * cases in rulePrecisionCorpus.test.ts. A rewrite is offered only when the fix
 * is fully determined by the words matched — never a guess about the
 * learner's gender (« je suis allé(e) » stays unrewritten).
 */
import type { TeachMe } from '../../../types';
import { FR_LETTER, NOT_BEFORE } from '../regexBoundary';
import { keepLeadingCase, patternRule, startsWithVowelSound, type GrammarRule } from './grammarRule';

const AP = "['’]";
/** Not followed by a letter or a hyphen (« grand » but not « grand-mère »). */
const NOT_AFTER_WORD = `(?![${FR_LETTER}-])`;
/** A subject or clitic directly before the word: « il la regarde » uses la as a pronoun, not a determiner. */
const NOT_AFTER_PRONOUN = `(?<!${NOT_BEFORE}(?:je|tu|il|elle|on|nous|vous|ils|elles|ne|me|te|se|y)\\s)`;

const alt = (words: readonly string[]) => words.join('|');

// ── Être verbs with avoir ────────────────────────────────────────────────────

const AVOIR_TO_ETRE: Record<string, string> = {
  "j'ai": 'je suis', 'tu as': 'tu es', 'il a': 'il est', 'elle a': 'elle est', 'on a': 'on est',
  'nous avons': 'nous sommes', 'vous avez': 'vous êtes', 'ils ont': 'ils sont', 'elles ont': 'elles sont',
};
/** Only the subjects whose participle agreement is fixed by the words alone. */
const AGREEMENT: Record<string, string> = { il: '', elle: 'e', ils: 's', elles: 'es' };
const ETRE_VERBS = ['arrivé', 'parti', 'resté', 'tombé', 'né', 'devenu', 'revenu', 'venu', 'allé'];
const AUX_ETRE_RE = new RegExp(
  `^(j${AP}ai|tu as|il a|elle a|on a|nous avons|vous avez|ils ont|elles ont)(\\s+(?:(?:déjà|jamais|bien|pas|toujours|aussi|vite|enfin)\\s+)?)(${alt(ETRE_VERBS)})(e|s|es)?$`,
  'i',
);

function auxEtreFix(match: string, gendered: 'label' | 'exact'): string | null {
  const m = AUX_ETRE_RE.exec(match);
  if (!m) return null;
  const aux = m[1].toLowerCase().replace('’', "'");
  const subject = aux.split(/[\s']/)[0] === 'j' ? 'je' : aux.split(' ')[0];
  const etre = AVOIR_TO_ETRE[aux];
  const ending = AGREEMENT[subject];
  if (ending === undefined) {
    // je / tu / on / nous / vous: the ending depends on who is speaking.
    if (gendered === 'exact') return null;
    const plural = subject === 'nous' || subject === 'vous';
    return keepLeadingCase(match, `${etre}${m[2]}${m[3]}${plural ? '(e)s' : '(e)'}`);
  }
  return keepLeadingCase(match, `${etre}${m[2]}${m[3]}${ending}`);
}

// ── Determiner gender on everyday nouns ──────────────────────────────────────
// Consonant-initial nouns only: before a vowel « mon amie » is correct, and
// elision has its own rules. Nouns with a second meaning in the other gender
// (le livre / la livre, le tour / la tour, la cour / le cours…) and nouns
// that change meaning with the ending (cousin / cousine) are left out.

const MASCULINE_NOUNS = [
  'père', 'frère', 'grand-père', 'beau-père', 'demi-frère', 'collège', 'lycée', 'sport', 'football', 'foot',
  'tennis', 'basket', 'rugby', 'week-end', 'weekend', 'cinéma', 'restaurant', 'travail', 'pays', 'système', 'musée',
  'film', 'match', 'repas', 'petit-déjeuner', 'déjeuner', 'dîner', 'jardin', 'village', 'quartier', 'parc', 'bus',
  'train', 'métier', 'légume', 'fromage', 'poisson', 'chocolat', 'gâteau', 'sandwich', 'thé', 'café', 'pain', 'vélo',
  'bateau', 'magasin', 'centre', 'voyage', 'stade', 'bureau', 'temps', 'monde', 'climat', 'téléphone', 'portable',
  'jeu', 'groupe', 'concert', 'journal', 'chien', 'chat', 'cheval', 'lit', 'salon', 'supermarché', 'marché', 'matin',
  'soir', 'jour', 'mois', 'sujet', 'piano', 'violon',
];
const FEMININE_NOUNS = [
  'mère', 'sœur', 'soeur', 'grand-mère', 'belle-mère', 'demi-sœur', 'tante', 'famille', 'maison', 'ville', 'plage',
  'voiture', 'musique', 'nourriture', 'campagne', 'montagne', 'cantine', 'matière', 'semaine', 'journée', 'soirée',
  'salle', 'piscine', 'gare', 'boulangerie', 'pollution', 'planète', 'nature', 'forêt', 'viande', 'salade', 'pizza',
  'chanson', 'télé', 'télévision', 'radio', 'rue', 'région', 'langue', 'chimie', 'biologie', 'géographie', 'natation',
  'danse', 'guitare', 'batterie', 'santé', 'vie', 'chambre', 'classe', 'lecture', 'technologie', 'robe', 'jupe',
  'chemise', 'veste', 'boisson', 'baguette', 'pomme', 'banane', 'soupe', 'neige', 'pluie', 'saison', 'table', 'porte',
  'fenêtre', 'moto', 'photo', 'carte', 'lettre',
];
const MASC_SET = new Set(MASCULINE_NOUNS);
const FEMININE_GROUP = alt(FEMININE_NOUNS);
const MASCULINE_GROUP = alt(MASCULINE_NOUNS);

/** Wrong determiner → right one, by the noun's gender. Prepositions travel with the article (à la → au). */
const TO_MASCULINE: Record<string, string> = {
  la: 'le', une: 'un', ma: 'mon', ta: 'ton', sa: 'son', 'à la': 'au', 'de la': 'du',
};
const TO_FEMININE: Record<string, string> = {
  le: 'la', un: 'une', mon: 'ma', ton: 'ta', son: 'sa', 'à le': 'à la', 'de le': 'de la', au: 'à la', du: 'de la',
};
const GEN_DET_RE = new RegExp(
  `${NOT_AFTER_PRONOUN}${NOT_BEFORE}(?:` +
    `(?:(à|de)\\s+)?(la|une|ma|ta|sa)\\s+(${MASCULINE_GROUP})` +
    `|(?:(à|de)\\s+)?(le|un|mon|ton|son|au|du)\\s+(${FEMININE_GROUP})` +
    `)${NOT_AFTER_WORD}`,
  'i',
);
const GEN_DET_PARTS = /^(?:(à|de)\s+)?(\S+)\s+(.+)$/i;

function genDetFix(match: string): string | null {
  const m = GEN_DET_PARTS.exec(match);
  if (!m) return null;
  const prep = m[1]?.toLowerCase();
  const det = m[2].toLowerCase();
  const noun = m[3];
  const key = prep ? `${prep} ${det}` : det;
  const table = MASC_SET.has(noun.toLowerCase()) ? TO_MASCULINE : TO_FEMININE;
  const fixed = table[key];
  if (!fixed) return null;
  return keepLeadingCase(match, `${fixed} ${noun}`);
}

// ── Adjective agreement after être ───────────────────────────────────────────

interface AdjForms { f: string; mp: string; fp: string }
const ADJECTIVES: Record<string, AdjForms> = {
  petit: { f: 'petite', mp: 'petits', fp: 'petites' },
  grand: { f: 'grande', mp: 'grands', fp: 'grandes' },
  content: { f: 'contente', mp: 'contents', fp: 'contentes' },
  intelligent: { f: 'intelligente', mp: 'intelligents', fp: 'intelligentes' },
  gentil: { f: 'gentille', mp: 'gentils', fp: 'gentilles' },
  sportif: { f: 'sportive', mp: 'sportifs', fp: 'sportives' },
  actif: { f: 'active', mp: 'actifs', fp: 'actives' },
  heureux: { f: 'heureuse', mp: 'heureux', fp: 'heureuses' },
  sérieux: { f: 'sérieuse', mp: 'sérieux', fp: 'sérieuses' },
  généreux: { f: 'généreuse', mp: 'généreux', fp: 'généreuses' },
  paresseux: { f: 'paresseuse', mp: 'paresseux', fp: 'paresseuses' },
  ennuyeux: { f: 'ennuyeuse', mp: 'ennuyeux', fp: 'ennuyeuses' },
  amusant: { f: 'amusante', mp: 'amusants', fp: 'amusantes' },
  intéressant: { f: 'intéressante', mp: 'intéressants', fp: 'intéressantes' },
  patient: { f: 'patiente', mp: 'patients', fp: 'patientes' },
  méchant: { f: 'méchante', mp: 'méchants', fp: 'méchantes' },
  blond: { f: 'blonde', mp: 'blonds', fp: 'blondes' },
  brun: { f: 'brune', mp: 'bruns', fp: 'brunes' },
  bavard: { f: 'bavarde', mp: 'bavards', fp: 'bavardes' },
  marrant: { f: 'marrante', mp: 'marrants', fp: 'marrantes' },
  joli: { f: 'jolie', mp: 'jolis', fp: 'jolies' },
  fatigué: { f: 'fatiguée', mp: 'fatigués', fp: 'fatiguées' },
  occupé: { f: 'occupée', mp: 'occupés', fp: 'occupées' },
  strict: { f: 'stricte', mp: 'stricts', fp: 'strictes' },
  français: { f: 'française', mp: 'français', fp: 'françaises' },
  anglais: { f: 'anglaise', mp: 'anglais', fp: 'anglaises' },
  américain: { f: 'américaine', mp: 'américains', fp: 'américaines' },
  italien: { f: 'italienne', mp: 'italiens', fp: 'italiennes' },
  mignon: { f: 'mignonne', mp: 'mignons', fp: 'mignonnes' },
  beau: { f: 'belle', mp: 'beaux', fp: 'belles' },
  nouveau: { f: 'nouvelle', mp: 'nouveaux', fp: 'nouvelles' },
  prêt: { f: 'prête', mp: 'prêts', fp: 'prêtes' },
  parfait: { f: 'parfaite', mp: 'parfaits', fp: 'parfaites' },
  différent: { f: 'différente', mp: 'différents', fp: 'différentes' },
  important: { f: 'importante', mp: 'importants', fp: 'importantes' },
  excellent: { f: 'excellente', mp: 'excellents', fp: 'excellentes' },
};

type Agreement = 'f' | 'mp' | 'fp';
/**
 * Subjects whose gender and number are known from the words alone: a pronoun,
 * or a determiner + one of these nouns. The determiner may itself be wrong
 * (« mon mère est gentil »): the noun decides, and the fix repairs both.
 */
const SUBJECT_PRONOUNS: Record<string, Agreement> = { elle: 'f', elles: 'fp', ils: 'mp' };
const FEM_SINGULAR_NOUNS = [
  'mère', 'sœur', 'soeur', 'tante', 'grand-mère', 'meilleure amie', 'famille', 'ville', 'maison', 'chambre', 'classe',
  'cantine', 'cousine', 'copine',
];
const MASC_PLURAL_NOUNS = ['parents', 'amis', 'frères', 'copains', 'grands-parents', 'profs', 'professeurs', 'cours', 'cousins'];
const FEM_PLURAL_NOUNS = ['sœurs', 'soeurs', 'amies', 'copines', 'matières', 'cousines'];
const NOUN_AGREEMENT = new Map<string, Agreement>([
  ...FEM_SINGULAR_NOUNS.map((s) => [s, 'f'] as [string, Agreement]),
  ...MASC_PLURAL_NOUNS.map((s) => [s, 'mp'] as [string, Agreement]),
  ...FEM_PLURAL_NOUNS.map((s) => [s, 'fp'] as [string, Agreement]),
]);
const SINGULAR_DETS = 'ma|mon|ta|ton|sa|son|la|le|notre|votre|leur';
const PLURAL_DETS = 'mes|tes|ses|les|nos|vos|leurs';
/** A feminine singular subject takes the feminine determiner. */
const TO_FEMININE_DET: Record<string, string> = { mon: 'ma', ton: 'ta', son: 'sa', le: 'la' };

const ADJ_AFTER_ETRE_RE = new RegExp(
  `${NOT_BEFORE}(elles|elle|ils|(?:${SINGULAR_DETS})\\s+(?:${alt(FEM_SINGULAR_NOUNS)})|(?:${PLURAL_DETS})\\s+(?:${alt([...MASC_PLURAL_NOUNS, ...FEM_PLURAL_NOUNS])}))\\s+` +
    `(est|était|sera|sont|étaient|seront)\\s+` +
    `((?:(?:très|assez|trop|vraiment|un peu|si|plutôt|super|toujours|souvent|aussi|tellement)\\s+)?)` +
    `(${alt(Object.keys(ADJECTIVES))})${NOT_AFTER_WORD}(?!\\s+à\\s+petit)`,
  'i',
);
const SINGULAR_VERBS = new Set(['est', 'était', 'sera']);

function subjectAgreement(subject: string): Agreement | null {
  const words = subject.toLowerCase().split(/\s+/);
  if (words.length === 1) return SUBJECT_PRONOUNS[words[0]] ?? null;
  return NOUN_AGREEMENT.get(words.slice(1).join(' ')) ?? null;
}

function adjTarget(m: RegExpExecArray | null): string | null {
  if (!m) return null;
  const agreement = subjectAgreement(m[1]);
  if (!agreement) return null;
  // The verb must match the subject's number; a mismatch is a different slip.
  if (SINGULAR_VERBS.has(m[2].toLowerCase()) !== (agreement === 'f')) return null;
  const forms = ADJECTIVES[m[4].toLowerCase()];
  if (!forms) return null;
  const target = forms[agreement];
  return target === m[4].toLowerCase() ? null : target;
}

function adjFix(match: string): string | null {
  const m = new RegExp(`^${ADJ_AFTER_ETRE_RE.source}$`, 'i').exec(match);
  const target = adjTarget(m);
  if (!m || !target) return null;
  const [det, ...rest] = m[1].split(/\s+/);
  const fixedDet = rest.length > 0 && subjectAgreement(m[1]) === 'f' ? TO_FEMININE_DET[det.toLowerCase()] : undefined;
  const subject = fixedDet ? keepLeadingCase(det, [fixedDet, ...rest].join(' ')) : m[1];
  return `${subject} ${m[2]} ${m[3]}${target}`;
}

// ── Negation with no « ne » ──────────────────────────────────────────────────

const NE_VERBS = [
  'suis', 'ai', 'vais', 'fais', 'peux', 'dois', 'veux', 'sais', 'vois', 'mange', 'parle', 'aime', 'adore', 'aimes',
  'aimons', 'aiment', 'est', 'es', 'a', 'as', 'va', 'vas', 'fait', 'peut', 'veut', 'sait', 'doit', 'avons', 'sommes',
  'ont', 'sont', 'vont', 'font', 'joue', 'joues', 'habite', 'comprends', 'comprend', 'crois', 'pense', 'connais',
  'connaît', 'regarde', 'travaille', 'aimais', 'aimait', 'étais', 'était', 'avais', 'avait', 'allais', 'pouvais',
  'voulais', 'pouvait', 'voulait', 'savais', 'trouve', 'déteste',
];
const NEG_WORDS = 'pas|jamais|rien';
const NEG_MISSING_NE_RE = new RegExp(
  `${NOT_BEFORE}(j${AP}|(?:je|tu|il|elle|on|nous|vous|ils|elles)\\s)(${alt(NE_VERBS)})\\s(${NEG_WORDS})(?![${FR_LETTER}])`,
  'i',
);

function negMissingNeFix(match: string): string | null {
  const m = new RegExp(`^${NEG_MISSING_NE_RE.source}$`, 'i').exec(match);
  if (!m) return null;
  const subject = /^j/i.test(m[1]) ? `${m[1].charAt(0)}e ` : m[1];
  const ne = startsWithVowelSound(m[2]) ? "n'" : 'ne ';
  return `${subject}${ne}${m[2]} ${m[3]}`;
}

const NEG_OTHER: Array<[RegExp, string]> = [
  [new RegExp(`^c${AP}est$`, 'i'), "ce n'est"],
  [new RegExp(`^c${AP}était$`, 'i'), "ce n'était"],
  [/^il y a$/i, "il n'y a"],
  [/^il y avait$/i, "il n'y avait"],
  [/^y a$/i, "il n'y a"],
  [/^ça va$/i, 'ça ne va'],
  [/^ça marche$/i, 'ça ne marche'],
  [/^ça sert$/i, 'ça ne sert'],
];
const NEG_OTHER_RE = new RegExp(
  `${NOT_BEFORE}(c${AP}est|c${AP}était|il y a|il y avait|(?<!${NOT_BEFORE}il\\s)(?<!${AP})y a|ça va|ça marche|ça sert)\\s(${NEG_WORDS})(?![${FR_LETTER}])`,
  'i',
);

function negOtherFix(match: string): string | null {
  const m = /^(.*)\s(\S+)$/.exec(match);
  if (!m) return null;
  for (const [re, fixed] of NEG_OTHER) {
    if (re.test(m[1])) return keepLeadingCase(match, `${fixed} ${m[2]}`);
  }
  return null;
}

// ── « si » + conditional ─────────────────────────────────────────────────────
// After « si » meaning "if", the verb is imparfait. After « si » meaning
// "whether" (« je ne sais pas si je pourrais »), a conditional is correct — so
// the reporting verbs before it are excluded.

const CONDITIONAL_TO_IMPARFAIT: Record<string, string> = {
  aur: 'av', ser: 'ét', fer: 'fais', ir: 'all', pourr: 'pouv', voudr: 'voul', devr: 'dev', saur: 'sav',
  viendr: 'ven', prendr: 'pren', aimer: 'aim', gagner: 'gagn', habiter: 'habit', achèter: 'achet', acheter: 'achet',
  voyager: 'voyage', travailler: 'travaill', manger: 'mange', jouer: 'jou', étudier: 'étudi', visiter: 'visit',
  partir: 'part', choisir: 'choisiss',
};
const COND_ENDINGS = 'ais|ait|ions|iez|aient';
const SI_COND_RE = new RegExp(
  `(?<!${NOT_BEFORE}(?:sais|sait|savais|savoir|demande|demandé|demandais|demander|comprends|dis|dit|voir)(?:\\s+pas)?\\s)` +
    `${NOT_BEFORE}(?:si\\s+(j${AP}|(?:je|tu|il|elle|on|nous|vous|ils|elles)\\s)|(s${AP}ils?\\s))` +
    `(${alt(Object.keys(CONDITIONAL_TO_IMPARFAIT))})(${COND_ENDINGS})(?![${FR_LETTER}])`,
  'i',
);

function siConditionalFix(match: string): string | null {
  const m = new RegExp(`^${SI_COND_RE.source}$`, 'i').exec(match);
  if (!m) return null;
  const stem = CONDITIONAL_TO_IMPARFAIT[m[3].toLowerCase()];
  if (!stem) return null;
  const verb = `${stem}${m[4].toLowerCase()}`;
  let head: string;
  if (m[2]) {
    head = m[2];
  } else {
    const subject = m[1].trim().toLowerCase().replace('’', "'");
    if (subject === "j'" || subject === 'je') head = startsWithVowelSound(verb) ? "si j'" : 'si je ';
    else if (subject === 'il' || subject === 'ils') head = `s'${subject} `;
    else head = `si ${subject} `;
  }
  return keepLeadingCase(match, `${head}${verb}`);
}

// ── Countries and cities ─────────────────────────────────────────────────────

const FEMININE_COUNTRIES = [
  'France', 'Angleterre', 'Espagne', 'Italie', 'Allemagne', 'Écosse', 'Ecosse', 'Irlande', 'Chine', 'Inde', 'Suisse',
  'Belgique', 'Grèce', 'Australie', 'Russie', 'Turquie', 'Afrique', 'Amérique', 'Europe', 'Asie', 'Grande-Bretagne',
];
const MASCULINE_COUNTRIES = ['Japon', 'Canada', 'Portugal', 'Maroc', 'Brésil', 'Mexique', 'Danemark', 'Sénégal', 'Pérou', 'Royaume-Uni', 'Pays de Galles', 'Vietnam', 'Kenya', 'Nigeria', 'Pakistan'];
const CITIES = ['Paris', 'Londres', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Lille', 'Madrid', 'Rome', 'Berlin', 'Dublin', 'Bruxelles'];
const PLACE_RE = new RegExp(
  `${NOT_BEFORE}(?:(?:à|au)\\s+(${alt(FEMININE_COUNTRIES)})|en\\s+(${alt(CITIES)})|(?:à|en)\\s+(${alt(MASCULINE_COUNTRIES)}))${NOT_AFTER_WORD}`,
  'i',
);

function placeFix(match: string): string | null {
  const m = new RegExp(`^${PLACE_RE.source}$`, 'i').exec(match);
  if (!m) return null;
  if (m[1]) return keepLeadingCase(match, `en ${m[1]}`);
  if (m[2]) return keepLeadingCase(match, `à ${m[2]}`);
  return m[3] ? keepLeadingCase(match, `au ${m[3]}`) : null;
}

// ── Verbs that take a bare infinitive ────────────────────────────────────────

const BARE_INF_VERBS = [
  'veux', 'veut', 'voulons', 'voulez', 'veulent', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'dois', 'doit',
  'devons', 'devez', 'doivent', 'voudrais', 'voudrait', 'aime', 'aimes', 'aimons', 'aimez', 'aiment', 'adore', 'adores',
  'adorent', 'préfère', 'préfères', 'préfèrent', 'déteste', 'détestes', 'détestent', 'vais', 'vas', 'va', 'allons',
  'allez', 'vont', 'sais', 'sait', 'aimerais', 'aimerait',
];
const INFINITIVES = [
  'jouer', 'manger', 'aller', 'faire', 'voyager', 'étudier', 'partir', 'sortir', 'travailler', 'devenir', 'regarder',
  'lire', 'visiter', 'habiter', 'apprendre', 'être', 'avoir', 'aider', 'acheter', 'continuer', 'rester', 'prendre',
  'voir', 'parler', 'gagner', 'nager', 'danser', 'chanter', 'dormir', 'écouter', 'écrire', 'utiliser', 'essayer', 'vivre',
];
const VERB_DE_INF_RE = new RegExp(
  `${NOT_BEFORE}(${alt(BARE_INF_VERBS)})\\s+(?:de\\s+|d${AP})(${alt(INFINITIVES)})(?![${FR_LETTER}])`,
  'i',
);

// ── Missing reflexive pronoun ────────────────────────────────────────────────

const REFLEXIVE_VERBS = [
  'lève', 'lèves', 'levons', 'levez', 'lèvent', 'réveille', 'réveilles', 'réveillons', 'réveillez', 'réveillent',
  'couche', 'couches', 'couchons', 'couchez', 'couchent', 'douche', 'douches', 'douchons', 'douchez', 'douchent',
  'habille', 'habilles', 'habillons', 'habillez', 'habillent',
];
const REFLEXIVE_PRONOUN: Record<string, [string, string]> = {
  je: ['me ', "m'"], tu: ['te ', "t'"], il: ['se ', "s'"], elle: ['se ', "s'"], on: ['se ', "s'"],
  nous: ['nous ', 'nous '], vous: ['vous ', 'vous '], ils: ['se ', "s'"], elles: ['se ', "s'"],
};
const REFL_RE = new RegExp(
  // « nous nous levons »: the second « nous » is the pronoun, so a subject right after nous/vous is not one.
  `(?<!${NOT_BEFORE}(?:nous|vous)\\s)${NOT_BEFORE}(je|tu|il|elle|on|nous|vous|ils|elles)\\s+(${alt(REFLEXIVE_VERBS)})` +
    // Only before a time expression: « je réveille souvent ma sœur » and « je couche à l'hôtel » are correct.
    `(?=\\s+(?:à\\s+(?:\\d|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|midi|minuit|vingt)|tôt|tard|vers|d${AP}habitude|le matin|le soir))`,
  'i',
);

function reflexiveFix(match: string): string | null {
  const m = /^(\S+)\s+(\S+)$/.exec(match);
  if (!m) return null;
  const pair = REFLEXIVE_PRONOUN[m[1].toLowerCase()];
  if (!pair) return null;
  const pronoun = startsWithVowelSound(m[2]) ? pair[1] : pair[0];
  return `${m[1]} ${pronoun}${m[2]}`;
}

// ── jouer à (sports) / jouer de (instruments) ────────────────────────────────

const JOUER_FORMS = 'jouer|joue|joues|jouons|jouez|jouent|jouais|jouait|jouaient|joué';
const SPORTS = 'foot|football|tennis|basket|rugby|badminton|volley|hockey|golf|handball|cricket';
const JOUER_SPORT_RE = new RegExp(`\\b(${JOUER_FORMS})\\s+(le|la|les|un|une)\\s+(${SPORTS})(?![${FR_LETTER}-])`, 'i');
const INSTRUMENTS: Record<string, 'm' | 'f'> = {
  piano: 'm', violon: 'm', saxophone: 'm', violoncelle: 'm', guitare: 'f', batterie: 'f', flûte: 'f', trompette: 'f',
  clarinette: 'f',
};
const JOUER_INSTRUMENT_RE = new RegExp(
  `\\b(${JOUER_FORMS})\\s+(le|la|un|une|au|à la)\\s+(${alt(Object.keys(INSTRUMENTS))})(?![${FR_LETTER}-])`,
  'i',
);

// ── The rules ────────────────────────────────────────────────────────────────

export const EXTRA_GRAMMAR_RULES: GrammarRule[] = [
  patternRule({
    id: 'aux_etre',
    theme: 'AUXILIARY',
    severity: 'major',
    pattern: new RegExp(
      `${NOT_BEFORE}(?:j${AP}ai|tu as|il a|elle a|on a|nous avons|vous avez|ils ont|elles ont)\\s+` +
        `(?:(?:déjà|jamais|bien|pas|toujours|aussi|vite|enfin)\\s+)?(?:${alt(ETRE_VERBS)})(?:e|s|es)?${NOT_AFTER_WORD}`,
      'i',
    ),
    buildDiagnostic: (q) =>
      `You said "${q}" — this is a movement / change-of-state verb, so its passé composé uses être, not avoir. With être, the participle agrees with the subject.`,
    correction: 'être + participle (je suis arrivé(e))',
    correctionFor: (m) => auxEtreFix(m, 'label'),
    rewrite: (m) => auxEtreFix(m, 'exact'),
  }),
  patternRule({
    id: 'si_conditional',
    theme: 'SI_CLAUSE',
    severity: 'major',
    pattern: SI_COND_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — after si ("if"), use the imparfait, never the conditional. The conditional goes in the other half: si j'avais le temps, je voyagerais.`,
    correction: 'si + imparfait (si j\'avais, si j\'étais)',
    rewrite: siConditionalFix,
    subsumes: ['el_si_il'],
  }),
  patternRule({
    id: 'el_si_il',
    theme: 'ELISION',
    severity: 'major',
    pattern: new RegExp(`${NOT_BEFORE}si\\s+(ils?)(?![${FR_LETTER}])`, 'i'),
    buildDiagnostic: (q) => `You said "${q}" — si elides before il and ils: s'il, s'ils (but si elle stays as it is).`,
    correction: "s'il / s'ils",
    rewrite: (m) => keepLeadingCase(m, `s'${m.replace(/^si\s+/i, '')}`),
  }),
  patternRule({
    id: 'prep_jouer_instrument',
    theme: 'PREPOSITION',
    severity: 'minor',
    pattern: JOUER_INSTRUMENT_RE,
    buildDiagnostic: (q) => `You said "${q}" — with instruments, jouer takes de: jouer du piano, jouer de la guitare.`,
    correction: 'jouer du … / de la …',
    subsumes: ['gen_det'],
    rewrite: (m) => {
      const p = new RegExp(`^${JOUER_INSTRUMENT_RE.source}$`, 'i').exec(m);
      if (!p) return null;
      const gender = INSTRUMENTS[p[3].toLowerCase()];
      return gender ? `${p[1]} ${gender === 'm' ? 'du' : 'de la'} ${p[3]}` : null;
    },
  }),
  patternRule({
    id: 'adj_after_etre',
    theme: 'ADJECTIVE',
    severity: 'minor',
    pattern: ADJ_AFTER_ETRE_RE,
    accept: (m) => adjTarget(m) !== null,
    buildDiagnostic: (q) =>
      `You said "${q}" — an adjective after être agrees with the subject: add -e for feminine, -s for plural (some change more: gentil → gentille, heureux → heureuse).`,
    correction: 'adjective + e / s',
    rewrite: adjFix,
    subsumes: ['gen_det'],
  }),
  patternRule({
    id: 'gen_det',
    theme: 'GENDER',
    severity: 'minor',
    pattern: GEN_DET_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — the determiner doesn't match the noun's gender. Learn each noun with its article (le/la, un/une, mon/ma) so the right one comes out automatically.`,
    correction: 'le ↔ la, un ↔ une, mon ↔ ma',
    rewrite: genDetFix,
  }),
  patternRule({
    id: 'neg_missing_ne_more',
    theme: 'NEGATION',
    severity: 'minor',
    pattern: NEG_OTHER_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — that's the casual spoken form. In a speaking exam, keep the full negation: ce n'est pas, il n'y a pas.`,
    correction: "ce n'est pas / il n'y a pas",
    rewrite: negOtherFix,
  }),
  patternRule({
    id: 'prep_country_city',
    theme: 'PREPOSITION',
    severity: 'minor',
    pattern: PLACE_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — use en with feminine countries (en France, en Angleterre), au with masculine ones (au Japon, au Canada) and à with cities (à Paris, à Londres).`,
    correction: 'en / au + country, à + city',
    rewrite: placeFix,
  }),
  patternRule({
    id: 'prep_verb_de_inf',
    theme: 'PREPOSITION',
    severity: 'minor',
    pattern: VERB_DE_INF_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — vouloir, pouvoir, devoir, aimer, préférer and aller take the infinitive straight after them, with no de: je veux jouer, j'aime lire.`,
    correction: '[verb] + infinitive (no de)',
    rewrite: (m) => m.replace(new RegExp(`\\s+(?:de\\s+|d${AP})`, 'i'), ' '),
  }),
  patternRule({
    id: 'refl_missing',
    theme: 'REFLEXIVE',
    severity: 'minor',
    pattern: REFL_RE,
    buildDiagnostic: (q) =>
      `You said "${q}" — daily-routine verbs are reflexive: je me lève, je me couche, il se réveille. The pronoun matches the subject.`,
    correction: 'je me …, il se …',
    rewrite: reflexiveFix,
  }),
  patternRule({
    id: 'comp_plus_meilleur',
    theme: 'COMPARATIVE',
    severity: 'minor',
    pattern: new RegExp(`${NOT_BEFORE}plus\\s+(meilleure?s?|mieux)(?![${FR_LETTER}])`, 'i'),
    buildDiagnostic: (q) => `You said "${q}" — meilleur and mieux already mean "better", so plus is doubled up: just meilleur / mieux.`,
    correction: 'meilleur / mieux (no plus)',
    rewrite: (m) => m.replace(/^plus\s+/i, ''),
  }),
  patternRule({
    id: 'ang_tres_beaucoup',
    theme: 'ANGLICISM',
    severity: 'minor',
    pattern: new RegExp(`${NOT_BEFORE}très\\s+beaucoup(?![${FR_LETTER}])`, 'i'),
    buildDiagnostic: (q) => `You said "${q}" — "very much" is just beaucoup in French; très never goes with beaucoup.`,
    correction: 'beaucoup',
    rewrite: () => 'beaucoup',
  }),
  patternRule({
    id: 'ang_interesse_dans',
    theme: 'ANGLICISM',
    severity: 'minor',
    pattern: new RegExp(`${NOT_BEFORE}(intéressée?s?)\\s+dans(?![${FR_LETTER}])`, 'i'),
    buildDiagnostic: (q) => `You said "${q}" — "interested in" is intéressé(e) par in French, not dans.`,
    correction: 'intéressé(e) par',
    rewrite: (m) => m.replace(/\s+dans$/i, ' par'),
  }),
  patternRule({
    id: 'ang_depend_sur',
    theme: 'ANGLICISM',
    severity: 'minor',
    pattern: new RegExp(`${NOT_BEFORE}(dépend|dépends|dépendent)\\s+sur(?:\\s+(le|les))?(?![${FR_LETTER}])`, 'i'),
    buildDiagnostic: (q) => `You said "${q}" — "depend on" is dépendre de in French: ça dépend de…, ça dépend du temps.`,
    correction: 'dépendre de',
    rewrite: (m) => {
      const p = /^(\S+)\s+sur(?:\s+(le|les))?$/i.exec(m);
      if (!p) return null;
      const article = p[2]?.toLowerCase();
      return `${p[1]} ${article === 'le' ? 'du' : article === 'les' ? 'des' : 'de'}`;
    },
  }),
];

/** The basic jouer rule (coachService's prep_jouer), widened to every form of jouer: every listed sport is masculine, so au / aux is fixed by the words. */
export const JOUER_SPORT_PATTERN = JOUER_SPORT_RE;
export function jouerSportRewrite(m: string): string | null {
  const p = new RegExp(`^${JOUER_SPORT_RE.source}$`, 'i').exec(m);
  return p ? `${p[1]} ${p[2].toLowerCase() === 'les' ? 'aux' : 'au'} ${p[3]}` : null;
}

/** Patterns the first rule set must not double-flag: « à le maison » is a gender slip (à la), not a missing « au ». */
export const FEMININE_NOUN_LOOKAHEAD = `(?!\\s+(?:${FEMININE_GROUP})${NOT_AFTER_WORD})`;

/** The basic negation rule's rewrite (coachService's neg_missing_ne), kept here beside its sibling. */
export const negMissingNeRewrite = negMissingNeFix;
/** The basic negation rule's pattern, widened to the common verbs learners use. */
export const NEG_MISSING_NE_PATTERN = NEG_MISSING_NE_RE;

export const EXTRA_TEACHME: Record<string, Partial<TeachMe>> = {
  aux_etre: {
    why: "English uses 'have' for every past tense ('I have arrived'), so avoir feels natural. But French verbs of movement and change of state — arriver, partir, rester, tomber, naître, devenir, revenir — take être in the passé composé, and the participle then agrees with the subject.",
    examples: [
      { fr: 'Nous sommes arrivés à neuf heures.', en: 'We arrived at nine. (not nous avons arrivé)' },
      { fr: 'Elle est restée à la maison.', en: 'She stayed at home. (not elle a resté)' },
      { fr: 'Ils sont partis en vacances.', en: 'They left on holiday. (not ils ont parti)' },
    ],
    advanced: "Une fois arrivés à l'hôtel, nous sommes tout de suite repartis vers la plage.",
    examinerNote: 'Être verbs come up in almost every past-tense answer — getting them right makes your past tense sound secure.',
  },
  gen_det: {
    why: 'English has one "the" and one "my", so the article never has to match anything. In French every noun is masculine or feminine, and le/la, un/une, mon/ma all follow it. The fix is to learn the noun and its article together, as one chunk: « la maison », « le collège ».',
    examples: [
      { fr: 'Ma mère travaille dans un hôpital.', en: 'My mother works in a hospital. (not mon mère)' },
      { fr: 'Je fais du sport le week-end.', en: 'I do sport at the weekend. (not de la sport)' },
      { fr: 'On va à la plage en été.', en: 'We go to the beach in summer. (not au plage)' },
    ],
    advanced: 'Ma famille et moi passons une semaine à la campagne chaque été.',
    examinerNote: 'Gender slips on everyday nouns (mère, sœur, maison, sport) are among the most frequent errors in speaking — they are easy to fix with practice.',
  },
  adj_after_etre: {
    why: "English adjectives never change ('she is tall', 'they are tall'). French adjectives agree with the noun or pronoun they describe, even after être: elle est grande, ils sont grands, elles sont grandes.",
    examples: [
      { fr: 'Ma sœur est très sportive.', en: 'My sister is very sporty. (not sportif)' },
      { fr: 'Mes parents sont gentils.', en: 'My parents are kind. (not gentil)' },
      { fr: 'Elle est heureuse au collège.', en: 'She is happy at school. (not heureux)' },
    ],
    advanced: 'Mes amies sont toujours prêtes à m\'aider quand je suis stressé(e).',
    examinerNote: 'Agreement after être is something you can hear — say the ending clearly (grande, contente) so it comes across.',
  },
  neg_missing_ne_more: {
    why: "French speakers often drop ne in casual speech (c'est pas grave), so you hear it all the time. In an exam conversation, use the full form — ce n'est pas, il n'y a pas — which is what you'd write.",
    examples: [
      { fr: "Ce n'est pas facile.", en: "It isn't easy. (not c'est pas)" },
      { fr: "Il n'y a pas de piscine dans ma ville.", en: "There isn't a pool in my town. (not il y a pas)" },
      { fr: "Ce n'était pas cher.", en: "It wasn't expensive. (not c'était pas)" },
    ],
    advanced: "Il n'y a rien de plus agréable qu'une journée à la plage.",
    examinerNote: 'Keeping the full negation shows control of a structure you need everywhere.',
  },
  si_conditional: {
    why: "English sometimes lets 'would' creep into the if-clause ('if I would have money'). French never does: the si half is in the imparfait, and the conditional goes in the other half.",
    examples: [
      { fr: "Si j'avais plus de temps, je ferais plus de sport.", en: 'If I had more time, I would do more sport. (not si j\'aurais)' },
      { fr: "Si j'étais riche, j'achèterais une maison.", en: 'If I were rich, I would buy a house. (not si je serais)' },
      { fr: "S'il faisait beau, on irait à la plage.", en: "If it were sunny, we'd go to the beach." },
    ],
    advanced: "Si je pouvais changer une chose, je rendrais les transports gratuits.",
    examinerNote: 'A correct si clause is a complex structure worth practising — it lets you answer "what would you do" questions well.',
  },
  el_si_il: {
    why: 'Si (if) elides before il and ils, just as je becomes j\' before a vowel: s\'il, s\'ils. It does not elide before elle: si elle.',
    examples: [
      { fr: "S'il pleut, je reste à la maison.", en: "If it rains, I stay at home. (not si il)" },
      { fr: "S'ils viennent, on va au cinéma.", en: "If they come, we'll go to the cinema." },
      { fr: 'Si elle veut, elle peut venir.', en: 'If she wants, she can come. (no elision before elle)' },
    ],
    examinerNote: 'Small elisions like s\'il make your French sound fluent and natural.',
  },
  prep_country_city: {
    why: "English uses 'in' or 'to' for everything. French picks the preposition from the place: en for feminine countries (en France, en Espagne), au for masculine ones (au Canada), à for cities (à Paris).",
    examples: [
      { fr: 'Je suis allé(e) en Espagne cet été.', en: 'I went to Spain this summer. (not à Espagne)' },
      { fr: "J'habite à Londres.", en: 'I live in London. (not en Londres)' },
      { fr: 'Mon oncle travaille au Canada.', en: 'My uncle works in Canada.' },
    ],
    advanced: "Après avoir passé une semaine en Italie, nous sommes rentrés à Paris.",
    examinerNote: 'Holiday answers use these prepositions constantly — they are worth getting automatic.',
  },
  prep_verb_de_inf: {
    why: "Some verbs take de before an infinitive (décider de, essayer de), so it's tempting to add de everywhere. But vouloir, pouvoir, devoir, aimer, adorer, préférer, détester and aller take the infinitive directly.",
    examples: [
      { fr: 'Je veux devenir médecin.', en: 'I want to become a doctor. (not je veux de devenir)' },
      { fr: "J'aime lire le soir.", en: 'I like reading in the evening. (not j\'aime de lire)' },
      { fr: 'Je vais voyager en Italie.', en: "I'm going to travel to Italy." },
    ],
    advanced: "J'aimerais vivre à l'étranger, mais je préfère d'abord finir mes études.",
    examinerNote: 'These verbs are everywhere in opinion and future answers — fixing this cleans up a lot of sentences at once.',
  },
  prep_jouer_instrument: {
    why: 'For instruments, jouer takes de: jouer du piano (de + le), jouer de la guitare. The article contracts like any de + le.',
    examples: [
      { fr: 'Je joue du piano depuis cinq ans.', en: "I've played the piano for five years. (not je joue le piano)" },
      { fr: 'Ma sœur joue de la guitare.', en: 'My sister plays the guitar.' },
      { fr: 'Il joue de la batterie dans un groupe.', en: 'He plays the drums in a band.' },
    ],
    examinerNote: 'Jouer de (instrument) vs jouer à (sport) is a classic distinction — hobbies answers use it all the time.',
  },
  refl_missing: {
    why: "English says 'I get up', 'I go to bed' with no pronoun. In French these are reflexive verbs — you get yourself up: je me lève, je me couche, il se réveille. The pronoun matches the subject.",
    examples: [
      { fr: 'Je me lève à sept heures.', en: 'I get up at seven. (not je lève à sept heures)' },
      { fr: 'Nous nous couchons tard le week-end.', en: 'We go to bed late at the weekend.' },
      { fr: "Elle s'habille vite le matin.", en: 'She gets dressed quickly in the morning.' },
    ],
    advanced: 'Pendant les vacances, je me réveille quand je veux et je me couche après minuit.',
    examinerNote: 'Daily-routine questions are common — reflexive verbs are the core of every answer about them.',
  },
  comp_plus_meilleur: {
    why: "Meilleur and mieux already contain the idea of 'more' — they are the irregular forms of 'plus bon' and 'plus bien'. Adding plus says 'more better'.",
    examples: [
      { fr: 'Ce film est meilleur que le livre.', en: 'This film is better than the book. (not plus meilleur)' },
      { fr: 'Je parle mieux maintenant.', en: 'I speak better now. (not plus mieux)' },
      { fr: "C'est le meilleur jour de la semaine.", en: "It's the best day of the week." },
    ],
    examinerNote: 'Comparisons are a great way to develop an answer — make sure the form is clean.',
  },
  ang_tres_beaucoup: {
    why: "English says 'very much', so très + beaucoup feels natural. In French beaucoup already carries the 'very much' — très never modifies it.",
    examples: [
      { fr: "J'aime beaucoup le sport.", en: 'I like sport very much. (not très beaucoup)' },
      { fr: "Merci beaucoup !", en: 'Thank you very much!' },
      { fr: "J'aime énormément voyager.", en: 'I love travelling — énormément is a stronger option.' },
    ],
    examinerNote: 'Calques like this signal translating from English — the fix is to learn the French chunk as a whole.',
  },
  ang_interesse_dans: {
    why: "English 'interested in' translates word by word to intéressé dans — but the French verb takes par: je suis intéressé(e) par, or s'intéresser à.",
    examples: [
      { fr: "Je suis intéressé(e) par l'histoire.", en: "I'm interested in history. (not dans)" },
      { fr: "Je m'intéresse à la musique.", en: "I'm interested in music." },
    ],
    examinerNote: 'Calques like this signal translating from English — the fix is to learn the French chunk as a whole.',
  },
  ang_depend_sur: {
    why: "English 'depend on' → dépend sur is a word-by-word calque. French uses de: ça dépend de toi, ça dépend du temps.",
    examples: [
      { fr: 'Ça dépend du temps.', en: 'It depends on the weather. (not dépend sur le temps)' },
      { fr: 'Ça dépend de mes notes.', en: 'It depends on my grades.' },
    ],
    examinerNote: 'Ça dépend de… is a useful phrase for nuanced answers — use it with de.',
  },
};
