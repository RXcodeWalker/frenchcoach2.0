import type { FeedbackV2, Question, CoachingIssue, IssueCategory, TranscriptSpan, TeachMe, ExpansionLevel } from '../../types';
import { classifyTier, buildTier0Result, buildTier1LocalResult } from './responseTier';
import { applyQualityGate } from './qualityGate';
import { detectAvoidance } from './diagnosticEngine';
import { NOT_BEFORE, NOT_AFTER } from './regexBoundary';
import { evaluateDemandSatisfaction } from '../../domain/learn/demand/satisfaction';
import { findSelfCorrection, type SelfCorrection } from '../../domain/learn/feedback/selfCorrection';
import { keepLeadingCase, patternRule, startsWithVowelSound, type CapturedSpan, type GrammarRule, type ThemeKey } from './offline/grammarRule';
import {
  EXTRA_GRAMMAR_RULES,
  EXTRA_TEACHME,
  FEMININE_NOUN_LOOKAHEAD,
  JOUER_SPORT_PATTERN,
  NEG_MISSING_NE_PATTERN,
  jouerSportRewrite,
  negMissingNeRewrite,
} from './offline/extraRules';
import { findOfflineStrengths, type BlockedSpan } from './offline/strengths';
import { checkEnglish, type EnglishRun } from './offline/englishCheck';
import { buildNextSteps, buildRepetitionVocab } from './offline/nextSteps';

// ── Diagnostic themes ──────────────────────────────────────────────────────────
const THEMES: Record<ThemeKey, { label: string; desc: string; sde_key: string; master_tip: string }> = {
  ELISION:       { label: "Elision & Contraction",       desc: "In French, words like je, le, la, de, que must contract before a vowel or mute H.", sde_key: "elision",       master_tip: "Think of French as a smooth flow — je aime is impossible; it must be j'aime." },
  AUXILIARY:     { label: "Avoir vs Être",               desc: "Most verbs use avoir in the past, but movement and reflexive verbs require être.",    sde_key: "etre_avoir",    master_tip: "Remember DR MRS VANDERTRAMP! If you're physically moving, use Être." },
  ANGLICISM:     { label: "The English Trap",            desc: "Word-for-word translation from English often creates Franglais.",                     sde_key: "vocab_range",   master_tip: "French logic is different — you 'have' an age, hunger, or thirst; you don't 'be' them!" },
  GENDER:        { label: "Gender Agreement",            desc: "Masculine and feminine nouns require matching articles and adjective endings.",        sde_key: "gender",        master_tip: "Suffixes are clues! Words ending in -ion, -té, -ette are usually feminine." },
  NEGATION:      { label: "Negative Structures",         desc: "Formal French negation is a sandwich around the verb (ne ... pas).",                 sde_key: "negation",      master_tip: "Even if you omit ne in casual speech, examiners want the full sandwich: Je NE mange PAS." },
  PREPOSITION:   { label: "Tricky Prepositions",         desc: "Certain verbs take specific prepositions (à, de) or none at all.",                   sde_key: "preposition",   master_tip: "Don't translate 'to' or 'for' directly. Learn écouter and chercher as direct verbs." },
  SUBJUNCTIVE:   { label: "The Subjunctive Mood",        desc: "The subjunctive expresses necessity, emotion, or doubt.",                             sde_key: "subjunctive",   master_tip: "Use it after 'Il faut que…' to immediately impress examiners." },
  SI_CLAUSE:     { label: "Hypothetical Sequence",       desc: "The Si construction requires: Imparfait + Conditional.",                              sde_key: "hypothetical",  master_tip: "Si + Imparfait = Conditional (Si j'étais riche, j'achèterais...)." },
  RELATIVE:      { label: "Relative Pronouns",           desc: "Connecting clauses using qui, que, dont, and où.",                                    sde_key: "relative_pron", master_tip: "Qui is the subject, Que is the direct object!" },
  COMPARATIVE:   { label: "Comparatives & Superlatives", desc: "Comparing things using plus, moins, or aussi.",                                       sde_key: "comparative",   master_tip: "Don't forget the 'que'! Plus [adj] QUE..." },
  DEMONSTRATIVE: { label: "Demonstratives",              desc: "Pointing things out: ce, cette, ces, and celui-ci.",                                  sde_key: "demonstrative", master_tip: "Match the gender! Ce (m), Cette (f), Ces (pl)." },
  CONFUSION:     { label: "Word Confusions",             desc: "Common mix-ups like bien vs bon or mieux vs meilleur.",                               sde_key: "confusions",    master_tip: "Bon/Meilleur describe things (adjectives); Bien/Mieux describe actions (adverbs)." },
  ADJECTIVE:     { label: "Adjective Agreement",         desc: "Adjectives must match the number (plural) of the noun.",                             sde_key: "gender",        master_tip: "Always check your S at the end of adjectives describing multiple things!" },
  PRONOUN:       { label: "Pronoun Placement",           desc: "Object pronouns usually go before the verb in French.",                               sde_key: "grammar",       master_tip: "French is like a puzzle — the pronoun slides in right before the action!" },
  REFLEXIVE:     { label: "Reflexive Verbs",             desc: "Reflexive verbs need a pronoun that matches the subject: je me, tu te, il se, nous nous.", sde_key: "grammar",       master_tip: "Daily routine is reflexive — you get yourself up: je me lève, je me couche." },
};

// ── TeachMe library: cognitive explanations + 3 drills per rule ───────────────
export const TEACHME_LIBRARY: Record<string, Partial<TeachMe>> = {
  aux_aller: {
    why: "In English, 'I have gone' uses 'have' as the auxiliary, so you mapped it directly to 'j'ai'. But French movement verbs form the passé composé with être, not avoir. The trick: if you physically moved somewhere, use être.",
    examples: [
      { fr: "Je suis allé(e) au marché.", en: "I went to the market. (not j'ai allé)" },
      { fr: "Elle est venue chez moi hier.", en: "She came to my place yesterday. (not elle a venu)" },
      { fr: "Nous sommes arrivés en retard.", en: "We arrived late. (not nous avons arrivé)" },
    ],
    advanced: "Les délégués sont tous partis avant midi, ce qui a surpris l'organisateur.",
    examinerNote: "Missing être for DR MRS VANDERTRAMP verbs is an error the examiner will notice.",
  },
  aux_venir: {
    why: "Same anglicism as aller: 'I have come' → 'j'ai venu' is a direct English translation. Venir is a movement verb; movement verbs use être.",
    examples: [
      { fr: "Il est venu nous voir.", en: "He came to see us." },
      { fr: "Tu es venue comment ? En bus ?", en: "How did you come? By bus?" },
      { fr: "Elles sont venues tôt ce matin.", en: "They came early this morning." },
    ],
    advanced: "Dès qu'il est venu, l'atmosphère a changé.",
    examinerNote: "Agreement error (venu/venue) is another slip to avoid — add -e for feminine, -s for plural.",
  },
  el_je: {
    why: "English has no elision rule, so 'je aime' feels natural. But French phonetics forbid a vowel clash: je + any vowel → j'. This is one of the most basic rules examiners expect at every level.",
    examples: [
      { fr: "J'aime jouer au tennis.", en: "I love playing tennis. (not je aime)" },
      { fr: "J'arrive à l'école à huit heures.", en: "I arrive at school at 8. (not je arrive)" },
      { fr: "J'adore la musique française.", en: "I love French music. (not je adore)" },
    ],
    advanced: "Ce que j'apprécie le plus, c'est la diversité culturelle.",
    examinerNote: "Elision errors are marked as 'basic accuracy failures' — they signal the examiner that fundamental French phonetics are not secure.",
  },
  el_le_la: {
    why: "Just like je → j', the articles le and la contract to l' before a vowel or mute h. English has no equivalent, so learners write 'le école' by direct translation.",
    examples: [
      { fr: "L'école commence à neuf heures.", en: "School starts at 9. (not la école)" },
      { fr: "J'aime l'histoire.", en: "I like history. (not la histoire)" },
      { fr: "L'hôtel était magnifique.", en: "The hotel was magnificent. (not le hôtel)" },
    ],
    advanced: "L'environnement nous concerne tous.",
    examinerNote: "This error in a transcript suggests the student is writing/thinking in English and translating. Examiners note it as 'interference from L1'.",
  },
  el_de: {
    why: "'De un ami' sounds natural from English ('of a friend') but de contracts to d' before a vowel. This affects partitive articles, possession phrases, and many set expressions.",
    examples: [
      { fr: "J'ai beaucoup d'amis.", en: "I have many friends. (not de amis)" },
      { fr: "C'est d'une importance capitale.", en: "It is of great importance." },
      { fr: "J'ai besoin d'eau.", en: "I need water. (not de eau)" },
    ],
    advanced: "Il s'agit d'une question d'une complexité remarquable.",
    examinerNote: "Missing d' before a vowel is a common accuracy slip — say \"beaucoup d'amis\", \"besoin d'eau\".",
  },
  el_que: {
    why: "Que must elide to qu' before a vowel. English 'that' never changes form, so French learners often forget the apostrophe.",
    examples: [
      { fr: "Je pense qu'il a raison.", en: "I think he is right. (not que il)" },
      { fr: "Il faut qu'elle vienne.", en: "She must come. (not que elle)" },
      { fr: "Crois-tu qu'on puisse y aller ?", en: "Do you think we can go?" },
    ],
    advanced: "Je suis convaincu qu'une solution existe.",
    examinerNote: "Cambridge examiners view this as a basic mechanical error, equivalent to a spelling mistake in English.",
  },
  con_au: {
    why: "English has no contraction for 'to the', so learners write 'à le marché'. In French, à + le always → au, and à + les → aux. There is no exception.",
    examples: [
      { fr: "Je vais au marché.", en: "I go to the market. (not à le marché)" },
      { fr: "Il parle aux professeurs.", en: "He talks to the teachers. (not à les professeurs)" },
      { fr: "Elle joue au football.", en: "She plays football. (not à le football)" },
    ],
    advanced: "Je m'adresse aux décideurs politiques.",
    examinerNote: "Au/aux are so fundamental that their absence suggests the student is still at A1 level even if other language is stronger.",
  },
  con_du: {
    why: "De + le = du, de + les = des. English has 'of the' which never contracts, so 'de le' feels natural. But it is always wrong in French.",
    examples: [
      { fr: "J'ai mangé du pain.", en: "I ate some bread. (partitive — not de le pain)" },
      { fr: "Je rentre du lycée.", en: "I'm coming back from school. (not de le lycée)" },
      { fr: "C'est le professeur du collège.", en: "It's the teacher from the school." },
    ],
    advanced: "La richesse du vocabulaire reflète la maîtrise de la langue.",
    examinerNote: "Du as partitive article (j'ai mangé du pain) is tested explicitly in IGCSE listening and reading — production errors here are penalized.",
  },
  ang_age: {
    why: "English says 'I am 15' using the verb 'to be', which maps directly to être. But French conceptualizes age as something you possess: j'ai 15 ans. This is one of the most common A-Level anglicisms.",
    examples: [
      { fr: "J'ai seize ans.", en: "I am sixteen. (not je suis seize ans)" },
      { fr: "Mon frère a vingt ans.", en: "My brother is twenty." },
      { fr: "À l'âge de huit ans, j'ai commencé le piano.", en: "At age 8, I started piano." },
    ],
    advanced: "Lorsque j'aurai dix-huit ans, j'envisage de voyager seul.",
    examinerNote: "Examiners see 'je suis X ans' as a clear anglicism. It signals that the student is thinking in English and translating directly.",
  },
  ang_faim_soif: {
    why: "English 'I am hungry/thirsty/cold/afraid' uses 'to be'. French uses avoir for physical and emotional states: avoir faim, avoir soif, avoir froid, avoir peur, avoir raison. These must be memorized as fixed expressions.",
    examples: [
      { fr: "J'ai faim après l'entraînement.", en: "I am hungry after training. (not je suis faim)" },
      { fr: "Elle a peur des araignées.", en: "She is afraid of spiders." },
      { fr: "Nous avons froid en hiver.", en: "We are cold in winter." },
    ],
    advanced: "Avoir l'air + adjectif: Il a l'air fatigué (He looks/seems tired).",
    examinerNote: "Avoir expressions with physical states are tested at GCSE and beyond. A wrong avoir expression counts as a Quality of Language error; QoL is judged on how often errors occur across both conversations (TN p.12).",
  },
  gen_probleme: {
    why: "English has no grammatical gender, so 'la problème' feels as natural as 'le problème'. But problème is masculine (-ème suffix pattern is typically masculine). Gender must be memorized with each noun.",
    examples: [
      { fr: "Le problème principal, c'est le manque de communication.", en: "The main problem is lack of communication." },
      { fr: "Ce problème est difficile à résoudre.", en: "This problem is hard to solve." },
      { fr: "Quel problème ! (not quelle)", en: "What a problem!" },
    ],
    advanced: "Le véritable problème réside dans l'absence de volonté politique.",
    examinerNote: "A gender error counts as a Quality of Language error; QoL is judged on how often errors occur across both conversations (TN p.12).",
  },
  prep_jouer: {
    why: "English 'play football' has no preposition. French 'jouer à' is obligatory for sports and games: jouer au (à + le) foot, jouer à la pétanque, jouer aux échecs.",
    examples: [
      { fr: "Je joue au football deux fois par semaine.", en: "I play football twice a week." },
      { fr: "Elle joue à la pétanque.", en: "She plays pétanque." },
      { fr: "Ils jouent aux jeux vidéo.", en: "They play video games." },
    ],
    advanced: "En revanche, pour les instruments: jouer du piano, jouer de la guitare.",
    examinerNote: "Jouer à (sport) vs jouer de (instrument) is a classic IGCSE distinction tested in reading/listening papers.",
  },
  prep_ecouter_a: {
    why: "English 'listen TO music' uses a preposition. French écouter is a direct transitive verb — no preposition needed. This is a systematic English interference pattern.",
    examples: [
      { fr: "J'écoute de la musique.", en: "I listen to music. (not écouter à)" },
    ],
    advanced: "Les verbes transitifs directs comme écouter se distinguent de leur équivalent anglais qui exige une préposition.",
    examinerNote: "Preposition errors with common verbs usually come from English interference — learn each verb together with its preposition.",
  },
  subj_il_faut: {
    why: "Il faut que triggers the subjunctive because it expresses necessity — a subjective stance. English uses the infinitive ('I have to go'), so learners write 'il faut que je vais', directly translating the indicative.",
    examples: [
      { fr: "Il faut que je fasse mes devoirs.", en: "I need to do my homework. (not je fais)" },
      { fr: "Il faut qu'elle soit prête à l'heure.", en: "She needs to be ready on time." },
      { fr: "Il faut que nous prenions une décision.", en: "We need to make a decision." },
    ],
    advanced: "Il est impératif que chacun prenne ses responsabilités au sérieux.",
    examinerNote: "Using the subjunctive correctly after il faut que shows control of a more complex structure.",
  },
  si_clause: {
    why: "English conditionals can use 'if + would' ('If I had money, I would buy'). French does not allow conditional in the si clause: si + imparfait → main clause + conditional. The si clause stays in imparfait.",
    examples: [
      { fr: "Si j'avais plus d'argent, j'achèterais une voiture.", en: "If I had more money, I would buy a car." },
      { fr: "Si elle était libre, elle viendrait.", en: "If she were free, she would come." },
      { fr: "Si tu travaillais plus, tu réussirais.", en: "If you worked more, you would succeed." },
    ],
    advanced: "Si j'avais su, je m'y serais préparé davantage.",
    examinerNote: "A correctly formed si clause with imparfait + conditional is a complex structure worth practising — even one correct example shows you can use it.",
  },
  pron_placement: {
    why: "English places object pronouns after the verb ('I see him', 'I call her'). French reverses this: the pronoun goes before the verb. This is a deeply embedded English word-order habit.",
    examples: [
      { fr: "Je le vois tous les jours.", en: "I see him every day. (not je vois le)" },
      { fr: "Elle lui téléphone souvent.", en: "She calls him often." },
      { fr: "Nous les invitons ce soir.", en: "We're inviting them tonight." },
    ],
    advanced: "Je ne le lui ai pas encore dit, mais j'ai l'intention de le faire.",
    examinerNote: "Pronoun order errors suggest the student has not yet internalized basic French syntax. Aim to eliminate all instances before the exam.",
  },
  neg_missing_ne: {
    why: "In spoken informal French, ne is often dropped ('je sais pas'). But in IGCSE speaking assessments, examiners mark to the formal written standard. The ne is mandatory in formal spoken production.",
    examples: [
      { fr: "Je ne sais pas.", en: "I don't know. (not je sais pas in formal speech)" },
      { fr: "Il ne vient pas aujourd'hui.", en: "He's not coming today." },
      { fr: "Nous ne pouvons pas y aller.", en: "We can't go there." },
    ],
    advanced: "Je ne saurais dire avec certitude ce qui l'a motivé.",
    examinerNote: "Dropping ne is normal in casual speech, but keep ne … pas when you want to sound formal.",
  },
  rel_qui_subj: {
    why: "Qui introduces a relative clause where the relative pronoun is the SUBJECT of the clause. If a personal pronoun (je, tu, il…) follows qui, that relative pronoun should be que (object), not qui.",
    examples: [
      { fr: "C'est quelqu'un qui parle bien.", en: "It's someone who speaks well. (qui = subject)" },
      { fr: "C'est le livre que je lis.", en: "It's the book that I'm reading. (que = object)" },
      { fr: "L'ami qui m'a aidé s'appelle Marc.", en: "The friend who helped me is called Marc." },
    ],
    advanced: "Ce dont j'ai besoin, c'est d'une formation plus spécialisée.",
    examinerNote: "Relative pronoun mastery (qui/que/dont/où) lets you build longer, more precise sentences than short separate ones.",
  },
  comp_meilleur: {
    why: "English 'more good' is incorrect — we say 'better'. French has the same irregularity: 'plus bon' is wrong, the correct form is meilleur (adjective comparative of bon).",
    examples: [
      { fr: "Cette solution est meilleure.", en: "This solution is better. (not plus bonne)" },
      { fr: "C'est le meilleur film de l'année.", en: "It's the best film of the year." },
      { fr: "Mon français est meilleur qu'avant.", en: "My French is better than before." },
    ],
    advanced: "La meilleure approche consisterait à combiner les deux méthodes.",
    examinerNote: "Using meilleur correctly signals grammatical awareness beyond basic level. Examiners reward it.",
  },
  comp_mieux: {
    why: "Bien (adverb: 'well') has the irregular comparative mieux ('better'). Just like English 'more well' → 'better', 'plus bien' → 'mieux' in French.",
    examples: [
      { fr: "Je parle mieux qu'avant.", en: "I speak better than before. (not plus bien)" },
      { fr: "Il joue mieux que son frère.", en: "He plays better than his brother." },
      { fr: "Ça va mieux aujourd'hui.", en: "Things are better today." },
    ],
    advanced: "Mieux vaut tard que jamais.",
    examinerNote: "Meilleur (adjective) vs mieux (adverb) distinction is a classic Cambridge discrimination point in writing and speaking.",
  },
  dem_cet: {
    why: "The masculine demonstrative ce becomes cet before a vowel or mute h for phonetic ease ('cet hôtel' not 'ce hôtel'). English 'this hotel/this man' never changes form.",
    examples: [
      { fr: "Cet hôtel est magnifique.", en: "This hotel is magnificent. (not ce hôtel)" },
      { fr: "Cet homme est professeur.", en: "This man is a teacher. (not ce homme)" },
      { fr: "Cet été a été exceptionnel.", en: "This summer was exceptional." },
    ],
    advanced: "Cet engouement pour les nouvelles technologies est-il vraiment justifié ?",
    examinerNote: "Cet vs ce before vowels is a classic accuracy detail. It signals phonetic awareness of French.",
  },
  ...EXTRA_TEACHME,
};

// ── Grammar rules ─────────────────────────────────────────────────────────────
// Every rule is built from one regex by patternRule (offline/grammarRule.ts),
// which gives it test / capture / captureAll — so every occurrence of an
// error is found, not just the first. The original 22 rules come first and
// keep their ids; the second set (offline/extraRules.ts) follows. Order
// matters: when two rules flag overlapping words, the earlier rule wins.

export type { CapturedSpan, GrammarRule } from './offline/grammarRule';

/** « nous » / « vous » before a verb of another person is an object pronoun (« il nous a pas dit »), not the subject. */
function negSubjectAgrees(m: RegExpExecArray): boolean {
  const subject = m[1].trim().toLowerCase();
  const verb = m[2].toLowerCase();
  if (subject === 'nous') return /ons$/.test(verb) || verb === 'sommes';
  if (subject === 'vous') return /ez$/.test(verb) || verb === 'êtes';
  return true;
}

const ORIGINAL_GRAMMAR_RULES: GrammarRule[] = [
  patternRule({
    id: "el_je",
    theme: "ELISION", severity: "major",
    pattern: /\bje (aime|ai|habite|arrive|écoute|adore|étudie|espère|achète|utilise|organise|apprends|entends)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — je must elide to j' before a vowel sound. French phonetics forbid the vowel clash.`,
    correction: "j'…",
    // The verb is inside the match, so it's preserved: "je aime" -> "j'aime".
    rewrite: (m) => keepLeadingCase(m, m.replace(/^je\s+/i, "j'")),
  }),
  patternRule({
    id: "el_le_la",
    theme: "ELISION", severity: "major",
    pattern: new RegExp(`\\b(le|la) (hôtel|hôpital|avion|ordinateur|école|université|histoire|idée|avis|été|hiver|automne|examen|exercice)${NOT_AFTER}`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — le/la contracts to l' before a vowel or mute h. This is a fundamental French phonetics rule.`,
    correction: "l'…",
    // The noun is inside the match: "la école" -> "l'école".
    rewrite: (m) => keepLeadingCase(m, m.replace(/^(le|la)\s+/i, "l'")),
  }),
  patternRule({
    id: "el_de",
    theme: "ELISION", severity: "major",
    pattern: new RegExp(`\\bde (un|une|ami|amie|école|université|ordinateur|idée|avis|eau|argent|orange)${NOT_AFTER}`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — de contracts to d' before a vowel. Same rule as je → j'.`,
    correction: "d'…",
    rewrite: (m) => keepLeadingCase(m, m.replace(/^de\s+/i, "d'")),
  }),
  patternRule({
    id: "el_que",
    theme: "ELISION", severity: "major",
    pattern: /\bque (il|elle|ils|elles|on|un|une)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — que must elide to qu' before a vowel or h muet.`,
    correction: "qu'…",
    rewrite: (m) => keepLeadingCase(m, m.replace(/^que\s+/i, "qu'")),
  }),
  patternRule({
    id: "con_au",
    theme: "ELISION", severity: "major",
    // « à le maison » is a gender slip (à la maison), left to gen_det — not a missing « au ».
    pattern: new RegExp(`${NOT_BEFORE}à (le${FEMININE_NOUN_LOOKAHEAD}|les)\\b`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — à + le always contracts to au, and à + les to aux. There are no exceptions.`,
    correction: "au / aux",
    // The matched text is exactly "à le"/"à les" (NOT_BEFORE is a
    // zero-width lookbehind, so it consumes no characters) — replacing only
    // the match leaves anything before it (e.g. "jusqu'") untouched. Fully
    // determined by which alternative matched: no learner choice involved,
    // unlike aux_aller/aux_venir's gender-dependent "allé(e)".
    rewrite: (m) => (/les\s*$/i.test(m) ? 'aux' : 'au'),
  }),
  patternRule({
    id: "con_du",
    theme: "ELISION", severity: "major",
    pattern: new RegExp(`\\bde (le${FEMININE_NOUN_LOOKAHEAD}|les)\\b`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — de + le must contract to du, and de + les to des.`,
    correction: "du / des",
    // "du / des" here is the display label for two mechanically distinct
    // outcomes, not a genuine learner choice — the captured group determines
    // which one applies, same reasoning as con_au above.
    rewrite: (m) => (/les\s*$/i.test(m) ? 'des' : 'du'),
  }),
  patternRule({
    id: "aux_aller",
    theme: "AUXILIARY", severity: "major",
    pattern: new RegExp(`\\bj'ai allé${NOT_AFTER}`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — you translated 'I have gone' directly from English. Movement verbs use être in passé composé: je suis allé(e).`,
    correction: "je suis allé(e)",
  }),
  patternRule({
    id: "aux_venir",
    theme: "AUXILIARY", severity: "major",
    pattern: /\bj'ai venu\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — venir is a movement verb; it uses être, not avoir: je suis venu(e).`,
    correction: "je suis venu(e)",
  }),
  patternRule({
    id: "gen_probleme",
    theme: "GENDER", severity: "minor",
    pattern: /\bla problème\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — problème is masculine. The -ème suffix is a masculine indicator: le problème.`,
    correction: "le problème",
    rewrite: (m) => keepLeadingCase(m, 'le problème'),
  }),
  patternRule({
    id: "adj_plural",
    theme: "ADJECTIVE", severity: "minor",
    // français/anglais excluded — they are already correct in the masculine
    // plural (no -s), so flagging them told a correct student to introduce
    // an error that doesn't exist.
    pattern: /\b(les|mes|tes|ses|nos|vos|leurs) (amis|parents|enfants|élèves) (intelligent|grand|petit|content|important)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — the adjective must agree with the plural noun: add -s (or -ux for some endings).`,
    correction: "… [adjective]s",
    // All five adjectives take a plain -s with these masculine-plural nouns.
    rewrite: (m) => `${m}s`,
  }),
  patternRule({
    id: "ang_age",
    theme: "ANGLICISM", severity: "major",
    pattern: /\bje suis \d+ ?(ans)?\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — you translated 'I am [age]' directly from English. French uses avoir for age: j'ai … ans. You possess your age in French.`,
    correction: "j'ai … ans",
    rewrite: (m) => {
      const n = /\d+/.exec(m)?.[0];
      return n ? keepLeadingCase(m, `j'ai ${n} ans`) : null;
    },
  }),
  patternRule({
    id: "ang_faim_soif",
    theme: "ANGLICISM", severity: "major",
    pattern: /\bje suis (faim|soif|chaud|froid|peur|raison|sommeil)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — physical and emotional states use avoir, not être: j'ai faim, j'ai peur, j'ai froid. You 'have' these feelings in French.`,
    correction: "j'ai faim / soif / froid / peur / raison / sommeil",
    rewrite: (m) => keepLeadingCase(m, m.replace(/^je suis/i, "j'ai")),
  }),
  patternRule({
    id: "prep_jouer",
    theme: "PREPOSITION", severity: "minor",
    // Every form of jouer (jouer, je joue, on jouait…), not just the infinitive.
    pattern: JOUER_SPORT_PATTERN,
    buildDiagnostic: (q) => `You wrote "${q}" — sports require jouer à (not jouer + article directly): jouer au foot, jouer au tennis.`,
    correction: "jouer au / à la…",
    rewrite: jouerSportRewrite,
  }),
  patternRule({
    id: "prep_ecouter_a",
    theme: "PREPOSITION", severity: "minor",
    pattern: new RegExp(`écout(?:e|es|ons|ez|ent|ais|ait|iez|aient|é|er)\\s+(à|pour)${NOT_AFTER}`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — unlike English, écouter is a direct verb in French. No preposition is needed: j'écoute de la musique.`,
    correction: "[verb] [object] (no preposition)",
  }),
  patternRule({
    id: "subj_il_faut",
    theme: "SUBJUNCTIVE", severity: "major",
    pattern: /\bil faut que (je suis|j'ai|je vais|je fais|je peux|je veux|il est|il a|on est|nous sommes|vous êtes|ils sont)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — il faut que triggers the subjunctive, not the indicative. You translated the English infinitive directly: je vais → j'aille, je suis → je sois.`,
    correction: "il faut que je sois / j'aille / je fasse…",
    rewrite: (m) => {
      const SUBJUNCTIVE: Record<string, string> = {
        'je suis': 'je sois', "j'ai": "j'aie", 'je vais': "j'aille", 'je fais': 'je fasse', 'je peux': 'je puisse',
        'je veux': 'je veuille', 'il est': 'il soit', 'il a': 'il ait', 'on est': 'on soit', 'nous sommes': 'nous soyons',
        'vous êtes': 'vous soyez', 'ils sont': 'ils soient',
      };
      const p = /^(il faut )que (.+)$/i.exec(m);
      if (!p) return null;
      const fixed = SUBJUNCTIVE[p[2].toLowerCase()];
      if (!fixed) return null;
      return `${p[1]}${startsWithVowelSound(fixed) ? "qu'" : 'que '}${fixed.replace(/^je (?=[aeiouyh])/i, "j'")}`;
    },
  }),
  patternRule({
    id: "si_clause",
    theme: "SI_CLAUSE", severity: "major",
    // si + [subject] + imparfait (…ais/ait/ions/iez/aient), then — allowing an
    // intervening comma/subject rather than requiring strict adjacency — a
    // second clause using future tense (…erai/eras/era/erons/erez/eront or
    // the -ir-verb equivalents) instead of the required conditional. Covers
    // all persons (je/tu/il/elle/on/nous/vous/ils/elles), not just je/on.
    pattern: /\bsi (j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(ais|ait|ions|iez|aient)\b[^.!?]{0,50}?\b(j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(erai|eras|era|erons|erez|eront|irai|iras|ira|irons|irez|iront)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — after si + imparfait, the main clause must use the conditional (not future or present): si j'avais, j'achèterais (not j'achèterai).`,
    correction: "si [imparfait], [conditional]",
  }),
  patternRule({
    id: "pron_placement",
    theme: "PRONOUN", severity: "major",
    pattern: /\b(je|tu|il|elle|on|nous|vous|ils|elles) (aime|adore|vois|regarde|déteste|écoute|aide|comprends|crois|appelle|rencontre) (lui|leur|me|te|nous|vous)\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — object pronouns must come BEFORE the verb in French. English puts them after ('I see him'), French does not.`,
    correction: "[subject] [pronoun] [verb]",
  }),
  patternRule({
    id: "neg_missing_ne",
    theme: "NEGATION", severity: "minor",
    // "j'" has no following space before the verb, so it needs its own
    // alternative rather than sharing the "(pronoun) " prefix.
    pattern: NEG_MISSING_NE_PATTERN,
    accept: negSubjectAgrees,
    buildDiagnostic: (q) => `You wrote "${q}" — you dropped the ne. In IGCSE formal speech, the full sandwich is required: je NE [verb] PAS.`,
    correction: "je ne [verb] pas",
    rewrite: negMissingNeRewrite,
  }),
  patternRule({
    // A nested lookbehind is required: deleting the inner boundary check
    // introduces a false negative — "le monde qui je vois" would be wrongly
    // suppressed because "monde" ends in "de " (matching the "de " prefix
    // alternative literally, not just as a preposition token boundary).
    id: "rel_qui_subj",
    theme: "RELATIVE", severity: "major",
    pattern: new RegExp(`(?<!${NOT_BEFORE}(?:avec|à|a|pour|chez|sans|sur|dans|de|en) )${NOT_BEFORE}qui (?:j'|je|tu|il|elle|on|nous|vous|ils|elles)\\b`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — qui is for subjects (qui + verb). If a personal pronoun follows, use que instead: c'est le film que j'ai vu.`,
    correction: "que",
  }),
  patternRule({
    id: "comp_meilleur",
    theme: "COMPARATIVE", severity: "major",
    pattern: /\bplus bon\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — bon has an irregular comparative: meilleur (just like English 'more good' → 'better'). Never say 'plus bon'.`,
    correction: "meilleur(e)",
  }),
  patternRule({
    id: "comp_mieux",
    theme: "COMPARATIVE", severity: "major",
    pattern: /\bplus bien\b/i,
    buildDiagnostic: (q) => `You wrote "${q}" — bien (adverb) has the irregular comparative mieux ('better'). Never say 'plus bien'.`,
    correction: "mieux",
    rewrite: (m) => keepLeadingCase(m, 'mieux'),
  }),
  patternRule({
    id: "dem_cet",
    theme: "DEMONSTRATIVE", severity: "minor",
    pattern: new RegExp(`\\bce (hôtel|homme|ordinateur|été|ami|avion)${NOT_AFTER}`, 'i'),
    buildDiagnostic: (q) => `You wrote "${q}" — masculine ce becomes cet before a vowel or mute h. This is for phonetic ease: cet hôtel, cet homme.`,
    correction: "cet …",
    rewrite: (m) => keepLeadingCase(m, m.replace(/^ce\s+/i, 'cet ')),
  }),
];

export const GRAMMAR_RULES: GrammarRule[] = [...ORIGINAL_GRAMMAR_RULES, ...EXTRA_GRAMMAR_RULES];

const STYLE_UPGRADES = [
  { detect: (t: string) => /^C'est (important|primordial|crucial|essentiel|bien|intéressant)\b/i.test(t), upgrade: "Ce qui est $1, c'est que…", label: "Cleft Sentence",       benefit: "Sophisticated emphasis." },
  { detect: (t: string) => /\bj'aime (?!mieux)\b/i.test(t),                                              upgrade: "Ce que j'aime, c'est…",    label: "Structural Variation", benefit: "Varies sentence openers." },
  { detect: (t: string) => /\bje pense que\b/i.test(t),                                                  upgrade: "Il me semble que…",        label: "Sophisticated Opinion", benefit: "Nuanced expression." },
  { detect: (t: string) => /\bet aussi\b/i.test(t),                                                      upgrade: "Qui plus est…",            label: "Advanced Connector",   benefit: "High-level logical link." },
];

const VOCAB_UPGRADES = [
  { detect: (t: string) => /\b(bien|bon|bonne)\b/i.test(t),  basic: "bien/bon",  upgrade: "formidable, exceptionnel, enrichissant" },
  { detect: (t: string) => /\b(beaucoup)\b/i.test(t),        basic: "beaucoup",  upgrade: "énormément, une multitude de" },
  { detect: (t: string) => /\b(j'aime|j'adore)\b/i.test(t), basic: "j'aime",    upgrade: "ça me plaît, je suis passionné(e) par" },
  { detect: (t: string) => /\b(faire)\b/i.test(t),           basic: "faire",     upgrade: "réaliser, pratiquer, effectuer" },
];

// ── Vocabulary V2 rules: context-aware, extract actual phrase from transcript ──
interface VocabV2Rule {
  pattern: RegExp;
  tier: 'weak' | 'decent';
  getBasic: (m: RegExpMatchArray) => string;
  upgrades: { phrase: string; level: 'B1' | 'B2' | 'C1'; nuance: string }[];
}

const VOCAB_V2_RULES: VocabV2Rule[] = [
  // Safe for all contexts
  {
    pattern: /c'était (bien|bon|super|cool|sympa)\b/gi,
    tier: 'weak',
    getBasic: (m) => m[0],
    upgrades: [
      { phrase: "c'était formidable", level: 'B1', nuance: 'Much stronger positive evaluation' },
      { phrase: "c'était vraiment enrichissant", level: 'B2', nuance: 'Implies personal growth' },
    ],
  },
  // Safe for all contexts
  {
    pattern: /\bbeaucoup( de)?\b/gi,
    tier: 'decent',
    getBasic: (m) => m[0],
    upgrades: [
      { phrase: "énormément de", level: 'B1', nuance: 'Stronger degree' },
      { phrase: "une multitude de", level: 'B2', nuance: 'Richer register (countable nouns)' },
    ],
  },
  // Safe for all contexts — hedged opinion
  {
    pattern: /\bje pense que\b/gi,
    tier: 'decent',
    getBasic: (m) => m[0],
    upgrades: [
      { phrase: "il me semble que", level: 'B1', nuance: 'More nuanced, hedged opinion' },
      { phrase: "je suis convaincu(e) que", level: 'B2', nuance: 'Expresses conviction' },
    ],
  },
  // j'aime + infinitive ONLY → passionné par (avoids "je suis passionné par le chocolat")
  {
    pattern: /j'aime (?=\w+(?:er|ir|re)\b)/gi,
    tier: 'decent',
    getBasic: (m) => m[0].trimEnd(),
    upgrades: [
      { phrase: "je suis passionné(e) par", level: 'B1', nuance: 'Shows genuine enthusiasm for the activity' },
      { phrase: "ça me tient à cœur de", level: 'B2', nuance: 'Emotionally rich — idiomatic' },
    ],
  },
  // j'aime + noun/article → safer universal upgrades
  {
    pattern: /j'aime (?=le |la |les |l')/gi,
    tier: 'decent',
    getBasic: (m) => m[0].trimEnd(),
    upgrades: [
      { phrase: "j'apprécie vraiment", level: 'B1', nuance: 'Works for food, places, and activities' },
      { phrase: "ça me plaît énormément", level: 'B1', nuance: 'Natural upgrade, universal context' },
    ],
  },
  // Generic j'aime not followed by infinitive or article
  {
    pattern: /j'aime(?! (?:\w+(?:er|ir|re)\b|le |la |les |l'))/gi,
    tier: 'decent',
    getBasic: (m) => m[0].trimEnd(),
    upgrades: [
      { phrase: "j'apprécie vraiment", level: 'B1', nuance: 'Versatile upgrade for any context' },
    ],
  },
];

function _buildVocabV2(transcript: string): import('../../types').VocabularyEntry[] {
  const entries: import('../../types').VocabularyEntry[] = [];
  const seen = new Set<string>();

  for (const rule of VOCAB_V2_RULES) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(transcript);
    if (!match) continue;
    const basic = rule.getBasic(match);
    if (seen.has(basic.toLowerCase().trim())) continue;
    seen.add(basic.toLowerCase().trim());
    entries.push({ basic, tier: rule.tier, upgrades: rule.upgrades });
    if (entries.length >= 5) break;
  }

  return entries;
}

const FILLER_WORDS = [
  { word: "euh",   label: "Verbal Filler",      tip: "Try to pause silently instead of using 'euh'." },
  { word: "bah",   label: "Informal Filler",    tip: "Avoid 'bah' in formal exams; it sounds too casual." },
  { word: "alors", label: "Overused Connector", tip: "You're using 'alors' to buy time. Try 'par conséquent' for variety." },
];

// ── Internal helpers ───────────────────────────────────────────────────────────

function _detectFillers(t: string) {
  const findings: { word: string; count: number }[] = [];
  FILLER_WORDS.forEach(f => {
    const count = (t.toLowerCase().match(new RegExp(`\\b${f.word}\\b`, 'g')) || []).length;
    if (count >= 2) findings.push({ word: f.word, count });
  });
  return findings;
}

/**
 * All-or-nothing offline rewrite (docs Stage 4 item 3). improved_answer is
 * constructed only when EVERY fired rule can be applied deterministically and
 * safely: it has a `rewrite`, and its captured span doesn't overlap another
 * fired rule's span. If even one fired rule fails either condition, no
 * improved_answer is built at all — not from the applicable subset, and not
 * under a partial label. A sentence with some detected errors silently left
 * in reads as an authoritative corrected answer, and it is not one; the
 * individual corrections (grammar.critical/polish, issues[]) still ship
 * regardless; only the single rewritten-answer artifact is withheld.
 *
 * Rewrites are applied right-to-left by resolved offset so earlier
 * replacements cannot shift the offsets of ones still to come.
 */
function _buildImprovedAnswer(
  transcript: string,
  fired: { rule: GrammarRule; captured: CapturedSpan | null; override?: { span: CapturedSpan; replacement: string } }[],
): string | null {
  if (fired.length === 0) return null;

  const applicable: { span: CapturedSpan; replacement: string }[] = [];
  for (const { rule, captured, override } of fired) {
    if (override) {
      applicable.push(override);
      continue;
    }
    if (!rule.rewrite || !captured) return null;
    const replacement = rule.rewrite(captured.text);
    if (replacement === null) return null;
    applicable.push({ span: captured, replacement });
  }

  // Sort by start offset, then reject on any overlap — an overlap means two
  // rules disagree about the same stretch of the transcript, which is not a
  // safe mechanical rewrite.
  applicable.sort((a, b) => a.span.start - b.span.start);
  for (let i = 1; i < applicable.length; i++) {
    if (applicable[i].span.start < applicable[i - 1].span.end) return null;
  }

  // Apply right-to-left so earlier (lower-offset) replacements are unaffected
  // by later ones shifting the string length.
  let result = transcript;
  for (let i = applicable.length - 1; i >= 0; i--) {
    const { span, replacement } = applicable[i];
    result = result.slice(0, span.start) + replacement + result.slice(span.end);
  }
  return result;
}

// docs Stage 4 item 5: phrasing for the missed cognitive demand, used only
// when evaluateDemandSatisfaction returns 'not_attempted' — an authoritative
// absence (word count far below the responseLoad floor), never a guess.
// 'unknown' (marker not found, but absence can't be established) must never
// be rendered as a failure — see satisfaction.ts's module doc — so there is
// deliberately no phrasing for it here at all.
const COGNITIVE_DEMAND_OPPORTUNITY: Record<import('../../domain/learn/demand/types').CognitiveDemand, string> = {
  describe: 'Try adding more detail to your description — a couple more sentences would let you show off more language.',
  explain: 'Try explaining WHY, using a connector like "parce que" or "donc" to link your reason to your point.',
  justify: 'Try giving your opinion and a reason for it, using a phrase like "je pense que" or "à mon avis".',
  compare: 'Try comparing the two sides — a connector like "mais" or "par contre" would show the contrast clearly.',
  hypothesize: 'Try using "si" with an imperfect verb to set up a hypothesis, e.g. "si j\'avais…".',
};

/**
 * Offline biggest_opportunity (docs Stage 4 item 5): the L1 demand verdict
 * from evaluateDemandSatisfaction, not a fabricated always-on prompt.
 * 'not_attempted' is the only verdict this ever speaks to — 'met' has
 * nothing to flag, and 'unknown' has no authoritative absence to report.
 */
function _buildOfflineOpportunity(transcript: string, question: Question): string | undefined {
  if (!question.demands) return undefined;
  const state = evaluateDemandSatisfaction(transcript, question.demands);
  if (state !== 'not_attempted') return undefined;
  return COGNITIVE_DEMAND_OPPORTUNITY[question.demands.cognitiveDemand];
}

// docs Stage 4 item 6: frame text per structure — a slot to complete, never a
// full fabricated sentence claiming to be French the learner produced. Only
// structures with an unambiguous, generic frame are listed; anything else
// (perfect/imperfect/near-future/simple-future/negation with no dedicated
// frame here) is skipped rather than guessed.
const STRUCTURE_FRAME: Partial<Record<import('../../domain/learn/demand/types').LearnStructure, { frame: string; addedWhat: string }>> = {
  opinion: { frame: 'À mon avis, … .', addedWhat: 'an opinion opener' },
  justification: { frame: '… parce que … .', addedWhat: 'a reason with parce que' },
  comparison: { frame: '… , mais … .', addedWhat: 'a contrast with mais' },
  subjunctive: { frame: 'Il faut que … .', addedWhat: 'a subjunctive trigger' },
  conditional: { frame: 'Si … , … .', addedWhat: 'a hypothetical with si' },
};

const TIME_FRAME_FRAME: Partial<Record<import('../../domain/learn/demand/types').DemandTimeFrame, { frame: string; addedWhat: string }>> = {
  past: { frame: "…, j'ai … / je suis allé(e) … .", addedWhat: 'a past-tense detail' },
  future: { frame: 'La prochaine fois, je vais … .', addedWhat: 'a future-tense plan' },
  conditional: { frame: "Si j'avais le choix, je …ais … .", addedWhat: 'a conditional wish' },
};

/**
 * Ladder rungs as scaffolds, not fabricated French (docs Stage 4 item 6):
 * built from the question's demands.timeFrames/structures/sufficientAnswer
 * plus keyVocab, presented as frames to complete rather than claims about
 * what a correct answer looks like. Reuses ExpansionLevel unchanged (docs
 * Stage 3) — the same shape the tier-1 word-based ladder already uses.
 * Offline-only: this never runs for tier 0/1 (those keep their existing
 * single-word ladder from buildExpansionLevels).
 */
function _buildDemandLadder(question: Question): ExpansionLevel[] {
  if (!question.demands) return [];

  const rungs: ExpansionLevel[] = [];

  // Rung 1: a structure frame (opinion/justification/comparison/subjunctive/conditional).
  for (const structure of question.demands.structures) {
    const found = STRUCTURE_FRAME[structure];
    if (found) {
      rungs.push({ level: 1, sentence: found.frame, addedWhat: found.addedWhat });
      break;
    }
  }

  // Rung 2: a time-frame frame, distinct from whichever structure rung 1 used.
  for (const timeFrame of question.demands.timeFrames) {
    const found = TIME_FRAME_FRAME[timeFrame];
    if (found && rungs.length < 2) {
      rungs.push({ level: 2, sentence: found.frame, addedWhat: found.addedWhat });
      break;
    }
  }

  // Rung 3: key vocabulary to weave in, if the question has any tagged.
  if (question.keyVocab.length > 0) {
    const words = question.keyVocab.slice(0, 3).map(v => v.fr).join(', ');
    rungs.push({
      level: 3,
      sentence: `Essaie d'utiliser : ${words}.`,
      addedWhat: 'topic vocabulary from the question',
    });
  }

  // Levels must be 1/2/3 in order with no gaps for the UI's ExpansionLevelRow
  // key/arrow logic — renumber sequentially rather than leaving holes if a
  // frame was unavailable for a given slot.
  return rungs.slice(0, 3).map((rung, i) => ({ ...rung, level: (i + 1) as 1 | 2 | 3 }));
}

function _buildTranscriptAnnotations(issues: CoachingIssue[]): TranscriptSpan[] {
  const annotations: TranscriptSpan[] = [];
  for (const issue of issues) {
    // The offset comes from the regex match itself (docs Stage 4 item 4) —
    // never re-derived from the transcript, so no occurrence is ever guessed.
    // An issue with a quote but no span (shouldn't happen for GRAMMAR_RULES
    // issues, all of which carry captured offsets) is simply not annotated,
    // rather than falling back to a first-occurrence indexOf guess.
    if (!issue.span) continue;
    annotations.push({
      start: issue.span.start,
      end: issue.span.end,
      severity: issue.severity,
      category: issue.category,
      issueId: issue.id,
    });
  }
  return annotations;
}

function _sentenceAt(transcript: string, matchIndex: number): { start: number; end: number; text: string } {
  const sentenceStart = transcript.lastIndexOf('.', matchIndex - 1) + 1;
  const sentenceEnd = transcript.indexOf('.', matchIndex);
  const end = sentenceEnd === -1 ? transcript.length : sentenceEnd + 1;
  return { start: Math.max(0, sentenceStart), end, text: transcript.slice(Math.max(0, sentenceStart), end).trim() };
}

function _findStrongestMoment(
  transcript: string,
  annotations: TranscriptSpan[],
): { span: TranscriptSpan | undefined; explanation: string } {
  const annotatedRanges = annotations.map(a => ({ start: a.start, end: a.end }));
  const isClean = (start: number, end: number) =>
    !annotatedRanges.some(r => r.start < end && r.end > start);

  // Priority 1: correct passé composé (avoir or être auxiliary)
  // Common non-participle words that share a passé-composé-like ending
  // (e.g. "du" is the partitive article, not a participle) — denylisted so
  // they don't get false-praised as correct passé composé.
  const NON_PARTICIPLE_WORDS = new Set(['du', 'de', 'un', 'une', 'le', 'la', 'les', 'ce', 'qui', 'lui']);
  const pcPattern = /\b(j'ai|il a|elle a|nous avons|ils ont|je suis|il est|elle est|nous sommes|ils sont)\s+(\w+(é|i|u|is|it|ert))\b/i;
  const pcMatch = transcript.match(pcPattern);
  if (pcMatch && pcMatch.index !== undefined && !NON_PARTICIPLE_WORDS.has(pcMatch[2].toLowerCase()) && isClean(pcMatch.index, pcMatch.index + pcMatch[0].length)) {
    const s = _sentenceAt(transcript, pcMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'tense' },
      explanation: `Your phrase '${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' shows correct use of the passé composé — using a past tense shows you can talk about events, not just the present.`,
    };
  }

  // Priority 2: giving a reason (parce que / car / puisque)
  const reasonPattern = /\b(parce que|car|puisque)\b/i;
  const reasonMatch = transcript.match(reasonPattern);
  if (reasonMatch && reasonMatch.index !== undefined) {
    const s = _sentenceAt(transcript, reasonMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'fluency' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' is your strongest moment — giving a reason is what the Communication descriptors describe as justifying and explaining answers (TN p.11).`,
    };
  }

  // Priority 3: connector beyond "et" (mais, donc, alors, pourtant, cependant, etc.)
  const connectorPattern = /\b(mais|donc|alors|pourtant|cependant|néanmoins|toutefois|par contre|en revanche|d'ailleurs|en plus|de plus|ensuite|enfin|finalement)\b/i;
  const connMatch = transcript.match(connectorPattern);
  if (connMatch && connMatch.index !== undefined) {
    const word = connMatch[0];
    const s = _sentenceAt(transcript, connMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'fluency' },
      explanation: `Your use of '${word}' to link ideas shows you can organise your response logically — linking ideas makes your answer easier to follow.`,
    };
  }

  // Priority 4: relative clause (qui/que/dont/où connecting clauses)
  const relPattern = /\b\w+ (qui|que|qu'|dont|où) \w+/i;
  const relMatch = transcript.match(relPattern);
  if (relMatch && relMatch.index !== undefined && isClean(relMatch.index, relMatch.index + relMatch[0].length)) {
    const s = _sentenceAt(transcript, relMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'grammar' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' uses a relative clause to connect ideas — relative clauses let you say more in one sentence.`,
    };
  }

  // Priority 5: future or conditional form
  const futCondPattern = /\b(irai|ferai|serai|aurai|pourrai|devrai|aimerais|voudrais|serait|irais|ferais|aurais|faudrait)\b/i;
  const futMatch = transcript.match(futCondPattern);
  if (futMatch && futMatch.index !== undefined && isClean(futMatch.index, futMatch.index + futMatch[0].length)) {
    const s = _sentenceAt(transcript, futMatch.index);
    const isCond = /ais|ait|aient|ions|iez/.test(futMatch[0]);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'tense' },
      explanation: `Your ${isCond ? 'conditional' : 'future'} form in '${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' shows tense range beyond the present.`,
    };
  }

  // Priority 6: subjunctive / hypothetical (kept last — advanced)
  const advancedPattern = /\b(il faut que|si j'avais|si j'étais|ce que j'aime|il me semble que|à mon avis|selon moi)\b/i;
  const advMatch = transcript.match(advancedPattern);
  if (advMatch && advMatch.index !== undefined) {
    const s = _sentenceAt(transcript, advMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'grammar' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' demonstrates an advanced grammatical structure — a more complex structure, used well here.`,
    };
  }

  // Fallback: longest sentence with no error annotations, as a communication-based strength
  const sentences = transcript.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 8);
  const cleanSentences = sentences.filter(s => {
    const start = transcript.indexOf(s);
    return start !== -1 && isClean(start, start + s.length);
  });
  const longest = [...cleanSentences].sort((a, b) => b.length - a.length)[0];
  if (longest) {
    const start = transcript.indexOf(longest);
    const snippet = longest.length > 60 ? longest.slice(0, 60) + '…' : longest;
    return {
      span: { start, end: start + longest.length, severity: 'strong', category: 'fluency' },
      explanation: `'${snippet}' communicates your point clearly and directly — a clear, direct sentence like this is a good base to build on.`,
    };
  }

  // No span found at all
  return {
    span: undefined,
    explanation: annotations.length === 0
      ? 'Your response was largely accurate — a solid foundation to build from.'
      : 'Attempting complete, structured sentences shows linguistic ambition even when errors occur.',
  };
}

// Theme -> IssueCategory (UI display categorization for CoachingIssue.category).
// Distinct from the theme -> skillNodeId routing table in
// domain/igcse/evidence/framework/nodeMap.ts — same theme keys, different
// target vocabularies (e.g. SI_CLAUSE categorizes as 'tense' here but routes
// to the 'hypothetical' skill node there), so this is not one of the
// consolidated maps.
const THEME_TO_CATEGORY: Record<string, IssueCategory> = {
  ELISION: 'elision', AUXILIARY: 'auxiliary', ANGLICISM: 'anglicism',
  GENDER: 'gender', NEGATION: 'grammar', PREPOSITION: 'preposition',
  SUBJUNCTIVE: 'subjunctive', SI_CLAUSE: 'tense', ADJECTIVE: 'agreement',
  PRONOUN: 'grammar', RELATIVE: 'grammar', COMPARATIVE: 'grammar',
  DEMONSTRATIVE: 'grammar', CONFUSION: 'vocabulary',
};

// Multi-factor priority score for selecting topPriorityIssue
function _priorityScore(issue: CoachingIssue): number {
  return issue.marksImpact * 3
    + (issue.isRecurring ? 2 : 0)
    + (issue.category === 'anglicism' ? 1 : 0)
    + (issue.severity === 'major' ? 1 : 0)
    - (issue.category === 'pronunciation' ? 1 : 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

// Placeholder scores for the offline (no-LLM) path — never a fabricated mark.
// The `unscored: 'no_llm_offline'` flag on the result is the load-bearing
// signal; callers must key off that, not off these zeros, to detect "not
// really graded" (E2: a response with no real score is a failure state, not
// a 5 — see apiClient.NoScoreInFeedbackError for the same principle on the
// network path).
const OFFLINE_PLACEHOLDER_SCORES: FeedbackV2['scores'] = Object.freeze({
  overall: 0, communication: 0, language: 0, fluency: 0,
});

/** At most this many occurrences of one rule are listed — the lesson is the same each time. */
const MAX_MATCHES_PER_RULE = 3;

interface RuleMatch {
  rule: GrammarRule;
  captured: CapturedSpan;
  /** The exact fix for this match, when the rule can name it (the rewrite). */
  exact: string | null;
  /** What the learner is shown as the correction. */
  shown: string;
}

const spansOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

/**
 * Every occurrence of every rule, overlap-free. Earlier rules win an overlap;
 * the improved answer is marked unsafe unless the winner's rewrite is known to
 * repair the loser's words too (`subsumes`) — an overlap otherwise means two
 * diagnoses of the same words, and a mechanical rewrite of one would leave
 * the other in place.
 */
function _collectMatches(t: string): { matches: RuleMatch[]; rewriteUnsafe: boolean } {
  const matches: RuleMatch[] = [];
  let rewriteUnsafe = false;
  for (const rule of GRAMMAR_RULES) {
    const spans = rule.captureAll ? rule.captureAll(t) : [rule.capture?.(t)].filter((x): x is CapturedSpan => !!x);
    for (const captured of spans.slice(0, MAX_MATCHES_PER_RULE)) {
      const winner = matches.find((m) => spansOverlap(m.captured, captured));
      if (winner) {
        if (!winner.rule.subsumes?.includes(rule.id)) rewriteUnsafe = true;
        continue;
      }
      const exact = rule.rewrite?.(captured.text) ?? null;
      const shown = rule.correctionFor?.(captured.text) ?? exact ?? rule.correction;
      matches.push({ rule, captured, exact, shown });
    }
  }
  matches.sort((x, y) => x.captured.start - y.captured.start);
  return { matches, rewriteUnsafe };
}

/** English runs the glossary can translate become fixes; the rest become a next step. */
function _englishIssue(run: EnglishRun, index: number): CoachingIssue {
  const span = { start: run.start, end: run.end, severity: 'major' as const, category: 'vocabulary' as const };
  const id = index === 0 ? 'english_words' : `english_words:${index + 1}`;
  return {
    id,
    category: 'vocabulary',
    severity: 'major',
    quote: run.text,
    span: { ...span, issueId: id },
    diagnostic: `"${run.text}" is English — keep the whole answer in French: ${run.french}.`,
    correction: run.french ?? '',
    marksImpact: 1,
    themeLabel: 'English words',
    teachMe: {
      rule: 'Keep the whole answer in French.',
      why: "Switching to English for a word you don't have is natural, but the examiner can only credit French. If a word won't come, say it another way with words you know.",
      examples: [
        { fr: run.french ?? '', en: run.text },
        { fr: 'Je ne sais pas le mot, mais c\'est un endroit où on achète du pain.', en: "I don't know the word, but it's a place where you buy bread." },
      ],
    },
    evidence: run.text,
    sourceWords: run.text.split(/\s+/),
    confidence: 0.85,
  };
}

/** The first sentence of the model answer — a real French example for a mostly-English answer. */
function _firstSentence(text: string | undefined): string | null {
  const first = (text ?? '').trim().split(/(?<=[.!?])\s+/)[0]?.trim();
  return first ? first : null;
}

/** First `n` words of a span, as written (a quote must be a verbatim slice). */
function _leadingWords(transcript: string, start: number, end: number, n: number): string {
  const slice = transcript.slice(start, end);
  const m = new RegExp(`^\\S+(?:\\s+\\S+){0,${n - 1}}`).exec(slice);
  return m ? m[0] : slice;
}

/**
 * A mostly-English answer gets no grammar checks (there is little French to
 * check) and no praise for its "clearest sentence" — it gets one honest
 * fix: say it in French, with the model answer's first sentence as the
 * example when the question has one.
 */
function _buildMostlyEnglishResult(transcript: string, question: Question, runs: EnglishRun[], wordCount: number): FeedbackV2 {
  const first = runs[0];
  const quote = first ? _leadingWords(transcript, first.start, first.end, 8) : transcript.trim();
  const example = _firstSentence(question.modelAnswer);
  const issues: CoachingIssue[] = [];
  if (first && example) {
    const start = first.start;
    issues.push({
      id: 'english_answer',
      category: 'vocabulary',
      severity: 'major',
      quote,
      span: { start, end: start + quote.length, severity: 'major', category: 'vocabulary', issueId: 'english_answer' },
      diagnostic: 'Most of this answer was in English. Answer in French — short, simple sentences are a fine place to start.',
      correction: example,
      marksImpact: 2,
      themeLabel: 'English words',
      evidence: quote,
      confidence: 0.85,
    });
  }
  const demandLadder = _buildDemandLadder(question);
  return {
    responseTier: classifyTier(transcript),
    scores: { ...OFFLINE_PLACEHOLDER_SCORES },
    unscored: 'no_llm_offline',
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount,
    schemaVersion: 2,
    encouragement: `I heard mostly English: « ${quote} ». Let's get that into French.`,
    biggest_opportunity:
      'Answer in French, even if it is simpler than what you wanted to say: two or three short French sentences beat a long answer in English.',
    issues,
    topPriorityIssueId: issues[0]?.id,
    strengths: [],
    vocabularyV2: [],
    avoidanceReport: [],
    transcriptAnnotations: issues.flatMap((i) => (i.span ? [i.span] : [])),
    pronunciation: { score: null, issues: [] },
    ...(demandLadder.length > 0 ? { expansionLevels: demandLadder } : {}),
  };
}

export function evaluate(transcript: string, question: Question): FeedbackV2 {
  const tier = classifyTier(transcript);
  if (tier === 0) return buildTier0Result();
  if (tier === 1) return buildTier1LocalResult(transcript);

  const t = transcript;
  const wordCount = t.trim().split(/\s+/).filter(Boolean).length;

  const english = checkEnglish(t);
  if (english.mostlyEnglish) {
    return applyQualityGate(_buildMostlyEnglishResult(t, question, english.runs, wordCount), t);
  }

  const fillers = _detectFillers(t);

  // Every occurrence of every rule; a slip the learner repaired straight away
  // (« je aime, pardon, j'aime ») is credited, not listed as a mistake.
  const { matches, rewriteUnsafe } = _collectMatches(t);
  const selfCorrections: SelfCorrection[] = [];
  // In the improved answer a repaired slip is simply left out: « je aime,
  // pardon, j'aime le sport » becomes « j'aime le sport ».
  const repairs = new Map<RuleMatch, { span: CapturedSpan; replacement: string }>();
  const errors = matches.filter((m) => {
    if (!m.exact) return true;
    const fixed = findSelfCorrection(m.captured.text, m.exact, t);
    // The repair must come after the slip: when the fix only deletes words
    // (« veux de visiter » → « veux visiter »), the slip's own last words
    // would otherwise read as its repair.
    const repairAt = fixed ? t.indexOf(fixed.repair, m.captured.end) : -1;
    if (!fixed || repairAt === -1) return true;
    selfCorrections.push(fixed);
    const end = repairAt + fixed.repair.length;
    repairs.set(m, {
      span: { text: t.slice(m.captured.start, end), start: m.captured.start, end },
      replacement: keepLeadingCase(m.captured.text, fixed.repair),
    });
    return false;
  });

  const allErrors = errors.map((m) => ({
    theme: THEMES[m.rule.theme].label,
    themeKey: m.rule.theme,
    severity: m.rule.severity,
    diagnostic: m.rule.buildDiagnostic ? m.rule.buildDiagnostic(m.captured.text) : THEMES[m.rule.theme].desc,
    correction: m.shown,
    quote: m.captured.text,
    captured: m.captured,
    rule: m.rule,
    ruleId: m.rule.id,
  }));

  const style = STYLE_UPGRADES
    .filter(u => u.detect(t))
    .map(u => {
      const m = t.match(/C'est (important|primordial|crucial|essentiel|bien|intéressant)/i);
      return { label: u.label, suggestion: u.upgrade.replace('$1', m?.[1] ?? '') };
    });

  const vocabulary = VOCAB_UPGRADES
    .filter(u => u.detect(t))
    .slice(0, 3)
    .map(({ basic, upgrade }) => ({ basic, upgrade }));

  // One CoachingIssue per occurrence (ids stay the rule id for the first, so
  // existing lookups by rule id keep working), each with its own lesson.
  const seenPerRule = new Map<string, number>();
  const grammarIssues: CoachingIssue[] = allErrors.map((err) => {
    const themeKey = err.themeKey;
    const libraryEntry = TEACHME_LIBRARY[err.ruleId] ?? {};
    const n = (seenPerRule.get(err.ruleId) ?? 0) + 1;
    seenPerRule.set(err.ruleId, n);
    const id = n === 1 ? err.ruleId : `${err.ruleId}:${n}`;

    const baseTeachMe: TeachMe = {
      rule: THEMES[themeKey]?.desc ?? err.diagnostic,
      why: libraryEntry.why ?? err.diagnostic,
      mnemonic: THEMES[themeKey]?.master_tip,
      examples: libraryEntry.examples ?? [{ fr: err.correction, en: 'Corrected form' }],
      advanced: libraryEntry.advanced,
      examinerNote: libraryEntry.examinerNote,
    };

    const category = THEME_TO_CATEGORY[themeKey] ?? 'grammar';
    const severity = err.severity === 'major' ? 'major' : 'minor';

    return {
      id,
      category,
      severity,
      quote: err.quote,
      // Carries the regex match's own offset (docs Stage 4 item 4) so
      // _buildTranscriptAnnotations never has to re-find the quote via
      // indexOf — the offset is known at match time, never guessed.
      span: { start: err.captured.start, end: err.captured.end, severity, category, issueId: id },
      diagnostic: err.diagnostic,
      correction: err.correction,
      marksImpact: err.severity === 'major' ? 2 : 1,
      teachMe: baseTeachMe,
      themeLabel: THEMES[themeKey]?.label,
      evidence: err.quote || undefined,
      sourceWords: err.quote ? err.quote.split(/\s+/) : undefined,
      confidence: 0.95,
    } satisfies CoachingIssue;
  });

  // English the glossary can translate is a fix with real French to aim at;
  // the rest is a next step (never a correction we would have to invent).
  const translated = english.runs.filter((r) => r.french && !matches.some((m) => spansOverlap(m.captured, r)));
  const untranslated = english.runs.filter((r) => !r.french);
  const issues = [...grammarIssues, ...translated.map(_englishIssue)];

  // Sort by priority and select top priority
  const sortedIssues = [...issues].sort((a, b) => _priorityScore(b) - _priorityScore(a));
  const topPriorityIssue = sortedIssues[0];

  // Build transcript annotations and strongest moment
  const transcriptAnnotations = _buildTranscriptAnnotations(sortedIssues);
  const strongest = _findStrongestMoment(transcript, transcriptAnnotations);

  // Quoted strengths never overlap anything flagged — an error, a repaired
  // slip or English — so the coach never praises words it also corrects.
  const blocked: BlockedSpan[] = [...matches.map((m) => m.captured), ...english.runs];
  const strengths = findOfflineStrengths(t, blocked, question).map(({ quote, why }) => ({ quote, why }));

  // Build avoidance report for offline path
  const avoidanceReport = detectAvoidance(transcript, question);

  // Tag avoidance entries with confidence and evidence
  const taggedAvoidance = avoidanceReport.map(entry => ({
    ...entry,
    confidence: 0.75,
    evidence: transcript.split(/\s+/).find(w => entry.observation.toLowerCase().includes(w.toLowerCase())) ?? undefined,
  }));

  // Vocabulary: words leaned on (used again and again) first, then upgrades.
  const vocabSeen = new Set<string>();
  const taggedVocabV2 = [
    ...buildRepetitionVocab(transcript),
    ..._buildVocabV2(transcript).map(entry => ({
      ...entry,
      evidence: entry.basic,
      sourceWords: entry.basic.split(/\s+/),
      confidence: 0.88,
    })),
  ]
    .filter((entry) => {
      const key = entry.basic.toLowerCase().replace('’', "'").trim();
      if (vocabSeen.has(key)) return false;
      vocabSeen.add(key);
      return true;
    })
    .slice(0, 5);

  // All-or-nothing (docs Stage 4 item 3): null when any detected error can't
  // be safely rewritten — including English left in the answer — and the
  // individual corrections above still ship regardless. A repaired slip is
  // rewritten too, so the "better" version carries no error at all.
  const improvedAnswer =
    rewriteUnsafe || translated.length > 0 || untranslated.length > 0
      ? null
      : _buildImprovedAnswer(transcript, matches.map(m => ({ rule: m.rule, captured: m.captured, override: repairs.get(m) })));

  // docs Stage 4 item 5: L1 demand verdict only — never a fabricated always-on prompt.
  const biggestOpportunity = _buildOfflineOpportunity(transcript, question);

  // docs Stage 4 item 6: scaffolds, not fabricated French — empty when the
  // question has no demands/keyVocab to build frames from.
  const demandLadder = _buildDemandLadder(question);

  // Concrete next steps for this question, phrased as invitations to add
  // something — a detector miss is never reported as a failure.
  const nextSteps = buildNextSteps(transcript, question, untranslated);

  const grammarItem = (e: (typeof allErrors)[number]) => ({ theme: e.theme, severity: e.severity, msg: e.diagnostic, diagnostic: e.diagnostic, correction: e.correction });
  // One grammar item per rule (its first occurrence): these feed skill
  // evidence, which records that a rule fired, not how often.
  const firstPerRule = allErrors.filter((e, i) => allErrors.findIndex((o) => o.ruleId === e.ruleId) === i);

  const result: FeedbackV2 = {
    responseTier: tier,
    scores: { ...OFFLINE_PLACEHOLDER_SCORES },
    unscored: 'no_llm_offline',
    grammar: {
      critical: firstPerRule.filter(e => e.severity === "major").slice(0, 4).map(grammarItem),
      polish:   firstPerRule.filter(e => e.severity === "minor").slice(0, 3).map(grammarItem),
    },
    vocabulary,
    style,
    fillers,
    wordCount,
    // No cefrLevel here (docs Stage 4 item 7) — offline cannot honestly assess
    // a CEFR level from tense/connector/word counts, and emitting nothing is
    // correct rather than fabricating a fixed 'A2'.
    schemaVersion: 2,
    issues: sortedIssues.slice(0, 8),
    topPriorityIssueId: topPriorityIssue?.id,
    strongestMomentSpan: strongest.span,
    strongestMomentExplanation: strongest.explanation,
    ...(strengths.length > 0 ? { strengths } : {}),
    ...(selfCorrections.length > 0 ? { selfCorrections } : {}),
    ...(biggestOpportunity !== undefined ? { biggest_opportunity: biggestOpportunity } : {}),
    ...(nextSteps.length > 0 ? { expansion_ideas: nextSteps } : {}),
    vocabularyV2: taggedVocabV2,
    avoidanceReport: taggedAvoidance,
    transcriptAnnotations,
    pronunciation: { score: null, issues: [] },
    ...(improvedAnswer !== null ? { improved_answer: improvedAnswer } : {}),
    ...(demandLadder.length > 0 ? { expansionLevels: demandLadder } : {}),
  };

  return applyQualityGate(result, transcript);
}

export function getCoachingTip(skillId: string): string | null {
  const theme = Object.values(THEMES).find(t => t.sde_key === skillId);
  return theme?.master_tip ?? null;
}
