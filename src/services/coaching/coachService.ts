import type { FeedbackV2, Question, CoachingIssue, IssueCategory, TranscriptSpan, TeachMe, ExpansionLevel } from '../../types';
import { classifyTier, buildTier0Result, buildTier1LocalResult } from './responseTier';
import { applyQualityGate } from './qualityGate';
import { detectAvoidance } from './diagnosticEngine';
import { NOT_BEFORE, NOT_AFTER } from './regexBoundary';
import { evaluateDemandSatisfaction } from '../../domain/learn/demand/satisfaction';

// ── Diagnostic themes ──────────────────────────────────────────────────────────
const THEMES: Record<string, { label: string; desc: string; sde_key: string; master_tip: string }> = {
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
    examinerNote: "Missing être for DR MRS VANDERTRAMP verbs costs marks in every paper.",
  },
  aux_venir: {
    why: "Same anglicism as aller: 'I have come' → 'j'ai venu' is a direct English translation. Venir is a movement verb; movement verbs use être.",
    examples: [
      { fr: "Il est venu nous voir.", en: "He came to see us." },
      { fr: "Tu es venue comment ? En bus ?", en: "How did you come? By bus?" },
      { fr: "Elles sont venues tôt ce matin.", en: "They came early this morning." },
    ],
    advanced: "Dès qu'il est venu, l'atmosphère a changé.",
    examinerNote: "Agreement error (venu/venue) also costs marks — add -e for feminine, -s for plural.",
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
    examinerNote: "Missing d' before vowels is a Tier 1 accuracy error on Cambridge mark schemes.",
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
    examinerNote: "Avoir expressions with physical states are tested at GCSE and beyond. Systematic errors here lower the Language mark.",
  },
  gen_probleme: {
    why: "English has no grammatical gender, so 'la problème' feels as natural as 'le problème'. But problème is masculine (-ème suffix pattern is typically masculine). Gender must be memorized with each noun.",
    examples: [
      { fr: "Le problème principal, c'est le manque de communication.", en: "The main problem is lack of communication." },
      { fr: "Ce problème est difficile à résoudre.", en: "This problem is hard to solve." },
      { fr: "Quel problème ! (not quelle)", en: "What a problem!" },
    ],
    advanced: "Le véritable problème réside dans l'absence de volonté politique.",
    examinerNote: "Gender errors are systematic accuracy failures. Examiners note them cumulatively — two or three in a response reduce the Language band.",
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
    examinerNote: "Examiners consider preposition errors with common verbs a sign of intermediate-level interference. Fix these for Core-Secure access.",
  },
  subj_il_faut: {
    why: "Il faut que triggers the subjunctive because it expresses necessity — a subjective stance. English uses the infinitive ('I have to go'), so learners write 'il faut que je vais', directly translating the indicative.",
    examples: [
      { fr: "Il faut que je fasse mes devoirs.", en: "I need to do my homework. (not je fais)" },
      { fr: "Il faut qu'elle soit prête à l'heure.", en: "She needs to be ready on time." },
      { fr: "Il faut que nous prenions une décision.", en: "We need to make a decision." },
    ],
    advanced: "Il est impératif que chacun prenne ses responsabilités au sérieux.",
    examinerNote: "Using the subjunctive correctly after il faut que is one of the top Extended-band discriminators in IGCSE speaking assessments.",
  },
  si_clause: {
    why: "English conditionals can use 'if + would' ('If I had money, I would buy'). French does not allow conditional in the si clause: si + imparfait → main clause + conditional. The si clause stays in imparfait.",
    examples: [
      { fr: "Si j'avais plus d'argent, j'achèterais une voiture.", en: "If I had more money, I would buy a car." },
      { fr: "Si elle était libre, elle viendrait.", en: "If she were free, she would come." },
      { fr: "Si tu travaillais plus, tu réussirais.", en: "If you worked more, you would succeed." },
    ],
    advanced: "Si j'avais su, je m'y serais préparé davantage.",
    examinerNote: "A correctly formed si clause with imparfait + conditional is an Extended-High discriminator. Even one correct example boosts your Language score.",
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
    examinerNote: "Cambridge speaking rubrics specifically require formal register. Missing ne repeatedly will reduce your Fluency band.",
  },
  rel_qui_subj: {
    why: "Qui introduces a relative clause where the relative pronoun is the SUBJECT of the clause. If a personal pronoun (je, tu, il…) follows qui, that relative pronoun should be que (object), not qui.",
    examples: [
      { fr: "C'est quelqu'un qui parle bien.", en: "It's someone who speaks well. (qui = subject)" },
      { fr: "C'est le livre que je lis.", en: "It's the book that I'm reading. (que = object)" },
      { fr: "L'ami qui m'a aidé s'appelle Marc.", en: "The friend who helped me is called Marc." },
    ],
    advanced: "Ce dont j'ai besoin, c'est d'une formation plus spécialisée.",
    examinerNote: "Relative pronoun mastery (qui/que/dont/où) is tested at B1-B2 level and distinguishes Extended from Core performance.",
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
};

// ── Grammar rules: each entry has test + capture ──────────────────────────────

/**
 * A regex match's text plus its offset in the source transcript. capture()
 * used to return only the matched string, forcing _buildTranscriptAnnotations
 * to re-find it with transcript.indexOf(quote) — first-occurrence-only, no
 * overlap handling (docs Stage 4 item 4). A regex match already knows its
 * index; carrying it through here makes offline spans unambiguous by
 * construction instead of guessed.
 */
export interface CapturedSpan {
  text: string;
  start: number;
  end: number;
}

/** Shared capture implementation: every GRAMMAR_RULES entry runs the same
 * `t.match(regex)[0]` shape, so this is the one place that turns a regex
 * match into a CapturedSpan. */
function matchSpan(t: string, regex: RegExp): CapturedSpan | null {
  const m = regex.exec(t);
  if (!m || m.index === undefined) return null;
  return { text: m[0], start: m.index, end: m.index + m[0].length };
}

interface GrammarRule {
  id: string;
  theme: keyof typeof THEMES;
  severity: 'major' | 'minor';
  test: (t: string) => boolean;
  capture?: (t: string) => CapturedSpan | null;
  buildDiagnostic?: (quote: string) => string;
  correction: string;
  /**
   * Opt-in mechanical rewrite for unambiguous elisions only (docs Stage 4
   * item 2) — e.g. "je aime" -> "j'aime", "de le" -> "du", "à les" -> "aux".
   * Rules with a genuine choice ("je suis allé(e)", "du / des" as a pair)
   * get no rewrite and are never applied mechanically. Returning null means
   * "this particular match can't be rewritten safely" even though the rule
   * fired (should not normally happen if the rule has a rewrite at all, but
   * keeps the type honest for edge cases).
   */
  rewrite?: (match: string) => string | null;
}

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: "el_je",
    theme: "ELISION", severity: "major",
    test: (t) => /\bje (aime|ai|habite|arrive|écoute|adore|étudie|espère|achète|utilise|organise|apprends|entends)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bje (aime|ai|habite|arrive|écoute|adore|étudie|espère|achète|utilise|organise|apprends|entends)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — je must elide to j' before a vowel sound. French phonetics forbid the vowel clash.`,
    correction: "j'…",
    // The verb is inside the match, so it's preserved: "je aime" -> "j'aime".
    rewrite: (m) => m.replace(/^je\s+/i, "j'"),
  },
  {
    id: "el_le_la",
    theme: "ELISION", severity: "major",
    test: (t) => new RegExp(`\\b(le|la) (hôtel|hôpital|avion|ordinateur|école|université|histoire|idée|avis|été|hiver|automne|examen|exercice)${NOT_AFTER}`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`\\b(le|la) (hôtel|hôpital|avion|ordinateur|école|université|histoire|idée|avis|été|hiver|automne|examen|exercice)${NOT_AFTER}`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — le/la contracts to l' before a vowel or mute h. This is a fundamental French phonetics rule.`,
    correction: "l'…",
    // The noun is inside the match: "la école" -> "l'école".
    rewrite: (m) => m.replace(/^(le|la)\s+/i, "l'"),
  },
  {
    id: "el_de",
    theme: "ELISION", severity: "major",
    test: (t) => new RegExp(`\\bde (un|une|ami|amie|école|université|ordinateur|idée|avis|eau|argent|orange)${NOT_AFTER}`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`\\bde (un|une|ami|amie|école|université|ordinateur|idée|avis|eau|argent|orange)${NOT_AFTER}`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — de contracts to d' before a vowel. Same rule as je → j'.`,
    correction: "d'…",
    rewrite: (m) => m.replace(/^de\s+/i, "d'"),
  },
  {
    id: "el_que",
    theme: "ELISION", severity: "major",
    test: (t) => /\bque (il|elle|ils|elles|on|un|une)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bque (il|elle|ils|elles|on|un|une)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — que must elide to qu' before a vowel or h muet.`,
    correction: "qu'…",
    rewrite: (m) => m.replace(/^que\s+/i, "qu'"),
  },
  {
    id: "con_au",
    theme: "ELISION", severity: "major",
    test: (t) => new RegExp(`${NOT_BEFORE}à (le|les)\\b`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`${NOT_BEFORE}à (le|les)\\b`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — à + le always contracts to au, and à + les to aux. There are no exceptions.`,
    correction: "au / aux",
    // The matched text is exactly "à le"/"à les" (NOT_BEFORE is a
    // zero-width lookbehind, so it consumes no characters) — replacing only
    // the match leaves anything before it (e.g. "jusqu'") untouched. Fully
    // determined by which alternative matched: no learner choice involved,
    // unlike aux_aller/aux_venir's gender-dependent "allé(e)".
    rewrite: (m) => (/les\s*$/i.test(m) ? 'aux' : 'au'),
  },
  {
    id: "con_du",
    theme: "ELISION", severity: "major",
    test: (t) => /\bde (le|les)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bde (le|les)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — de + le must contract to du, and de + les to des.`,
    correction: "du / des",
    // "du / des" here is the display label for two mechanically distinct
    // outcomes, not a genuine learner choice — the captured group determines
    // which one applies, same reasoning as con_au above.
    rewrite: (m) => (/les\s*$/i.test(m) ? 'des' : 'du'),
  },
  {
    id: "aux_aller",
    theme: "AUXILIARY", severity: "major",
    test: (t) => new RegExp(`\\bj'ai allé${NOT_AFTER}`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`\\bj'ai allé${NOT_AFTER}`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — you translated 'I have gone' directly from English. Movement verbs use être in passé composé: je suis allé(e).`,
    correction: "je suis allé(e)",
  },
  {
    id: "aux_venir",
    theme: "AUXILIARY", severity: "major",
    test: (t) => /\bj'ai venu\b/i.test(t),
    capture: (t) => matchSpan(t, /\bj'ai venu\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — venir is a movement verb; it uses être, not avoir: je suis venu(e).`,
    correction: "je suis venu(e)",
  },
  {
    id: "gen_probleme",
    theme: "GENDER", severity: "minor",
    test: (t) => /\bla problème\b/i.test(t),
    capture: (t) => matchSpan(t, /\bla problème\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — problème is masculine. The -ème suffix is a masculine indicator: le problème.`,
    correction: "le problème",
  },
  {
    id: "adj_plural",
    theme: "ADJECTIVE", severity: "minor",
    // français/anglais excluded — they are already correct in the masculine
    // plural (no -s), so flagging them told a correct student to introduce
    // an error that doesn't exist.
    test: (t) => /\b(les|mes|tes|ses|nos|vos|leurs) (amis|parents|enfants|élèves) (intelligent|grand|petit|content|important)\b/i.test(t),
    capture: (t) => matchSpan(t, /\b(les|mes|tes|ses|nos|vos|leurs) (amis|parents|enfants|élèves) (intelligent|grand|petit|content|important)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — the adjective must agree with the plural noun: add -s (or -ux for some endings).`,
    correction: "… [adjective]s",
  },
  {
    id: "ang_age",
    theme: "ANGLICISM", severity: "major",
    test: (t) => /\bje suis \d+\b/i.test(t),
    capture: (t) => matchSpan(t, /\bje suis \d+ ?(ans)?\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — you translated 'I am [age]' directly from English. French uses avoir for age: j'ai … ans. You possess your age in French.`,
    correction: "j'ai … ans",
  },
  {
    id: "ang_faim_soif",
    theme: "ANGLICISM", severity: "major",
    test: (t) => /\bje suis (faim|soif|chaud|froid|peur|raison|sommeil)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bje suis (faim|soif|chaud|froid|peur|raison|sommeil)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — physical and emotional states use avoir, not être: j'ai faim, j'ai peur, j'ai froid. You 'have' these feelings in French.`,
    correction: "j'ai faim / soif / froid / peur / raison / sommeil",
  },
  {
    id: "prep_jouer",
    theme: "PREPOSITION", severity: "minor",
    test: (t) => /\bjouer (le|la|les|un|une) (foot|football|tennis|basket|rugby|badminton|volley)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bjouer (le|la|les|un|une) (foot|football|tennis|basket|rugby|badminton|volley)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — sports require jouer à (not jouer + article directly): jouer au foot, jouer au tennis.`,
    correction: "jouer au / à la…",
  },
  {
    id: "prep_ecouter_a",
    theme: "PREPOSITION", severity: "minor",
    test: (t) => new RegExp(`écout(?:e|es|ons|ez|ent|ais|ait|iez|aient|é|er)\\s+(à|pour)${NOT_AFTER}`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`écout(?:e|es|ons|ez|ent|ais|ait|iez|aient|é|er)\\s+(à|pour)${NOT_AFTER}`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — unlike English, écouter is a direct verb in French. No preposition is needed: j'écoute de la musique.`,
    correction: "[verb] [object] (no preposition)",
  },
  {
    id: "subj_il_faut",
    theme: "SUBJUNCTIVE", severity: "major",
    test: (t) => /\bil faut que (je suis|j'ai|je vais|je fais|je peux|je veux|il est|il a|on est|nous sommes|vous êtes|ils sont)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bil faut que (je suis|j'ai|je vais|je fais|je peux|je veux|il est|il a|on est|nous sommes|vous êtes|ils sont)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — il faut que triggers the subjunctive, not the indicative. You translated the English infinitive directly: je vais → j'aille, je suis → je sois.`,
    correction: "il faut que je sois / j'aille / je fasse…",
  },
  {
    id: "si_clause",
    theme: "SI_CLAUSE", severity: "major",
    // si + [subject] + imparfait (…ais/ait/ions/iez/aient), then — allowing an
    // intervening comma/subject rather than requiring strict adjacency — a
    // second clause using future tense (…erai/eras/era/erons/erez/eront or
    // the -ir-verb equivalents) instead of the required conditional. Covers
    // all persons (je/tu/il/elle/on/nous/vous/ils/elles), not just je/on.
    test: (t) => /\bsi (j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(ais|ait|ions|iez|aient)\b[^.!?]{0,50}?\b(j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(erai|eras|era|erons|erez|eront|irai|iras|ira|irons|irez|iront)\b/i.test(t),
    capture: (t) => matchSpan(t, /\bsi (j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(ais|ait|ions|iez|aient)\b[^.!?]{0,50}?\b(j'|je |tu |il |elle |on |nous |vous |ils |elles )[a-zàâäéèêëïîôöùûüç']*?(erai|eras|era|erons|erez|eront|irai|iras|ira|irons|irez|iront)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — after si + imparfait, the main clause must use the conditional (not future or present): si j'avais, j'achèterais (not j'achèterai).`,
    correction: "si [imparfait], [conditional]",
  },
  {
    id: "pron_placement",
    theme: "PRONOUN", severity: "major",
    test: (t) => /\b(je|tu|il|elle|on|nous|vous|ils|elles) (aime|adore|vois|regarde|déteste|écoute|aide|comprends|crois|appelle|rencontre) (lui|leur|me|te|nous|vous)\b/i.test(t),
    capture: (t) => matchSpan(t, /\b(je|tu|il|elle|on|nous|vous|ils|elles) (aime|adore|vois|regarde|déteste|écoute|aide|comprends|crois|appelle|rencontre) (lui|leur|me|te|nous|vous)\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — object pronouns must come BEFORE the verb in French. English puts them after ('I see him'), French does not.`,
    correction: "[subject] [pronoun] [verb]",
  },
  {
    id: "neg_missing_ne",
    theme: "NEGATION", severity: "minor",
    // "j'" has no following space before the verb, so it needs its own
    // alternative rather than sharing the "(pronoun) " prefix — the original
    // pattern required a space after j', which is unreachable (j'ai, not j' ai).
    test: (t) => new RegExp(`${NOT_BEFORE}(?:j'|(?:je|tu|il|elle|on|nous|vous|ils|elles) )(?:suis|ai|vais|fais|peux|dois|veux|sais|vois|mange|parle) pas\\b`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`${NOT_BEFORE}(?:j'|(?:je|tu|il|elle|on|nous|vous|ils|elles) )(?:suis|ai|vais|fais|peux|dois|veux|sais|vois|mange|parle) pas\\b`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — you dropped the ne. In IGCSE formal speech, the full sandwich is required: je NE [verb] PAS.`,
    correction: "je ne [verb] pas",
  },
  {
    // A nested lookbehind is required: deleting the inner boundary check
    // introduces a false negative — "le monde qui je vois" would be wrongly
    // suppressed because "monde" ends in "de " (matching the "de " prefix
    // alternative literally, not just as a preposition token boundary).
    id: "rel_qui_subj",
    theme: "RELATIVE", severity: "major",
    test: (t) => new RegExp(`(?<!${NOT_BEFORE}(?:avec|à|a|pour|chez|sans|sur|dans|de|en) )${NOT_BEFORE}qui (?:j'|je|tu|il|elle|on|nous|vous|ils|elles)\\b`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`(?<!${NOT_BEFORE}(?:avec|à|a|pour|chez|sans|sur|dans|de|en) )${NOT_BEFORE}qui (?:j'|je|tu|il|elle|on|nous|vous|ils|elles)\\b`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — qui is for subjects (qui + verb). If a personal pronoun follows, use que instead: c'est le film que j'ai vu.`,
    correction: "que",
  },
  {
    id: "comp_meilleur",
    theme: "COMPARATIVE", severity: "major",
    test: (t) => /\bplus bon\b/i.test(t),
    capture: (t) => matchSpan(t, /\bplus bon\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — bon has an irregular comparative: meilleur (just like English 'more good' → 'better'). Never say 'plus bon'.`,
    correction: "meilleur(e)",
  },
  {
    id: "comp_mieux",
    theme: "COMPARATIVE", severity: "major",
    test: (t) => /\bplus bien\b/i.test(t),
    capture: (t) => matchSpan(t, /\bplus bien\b/i),
    buildDiagnostic: (q) => `You wrote "${q}" — bien (adverb) has the irregular comparative mieux ('better'). Never say 'plus bien'.`,
    correction: "mieux",
  },
  {
    id: "dem_cet",
    theme: "DEMONSTRATIVE", severity: "minor",
    test: (t) => new RegExp(`\\bce (hôtel|homme|ordinateur|été|ami|avion)${NOT_AFTER}`, 'i').test(t),
    capture: (t) => matchSpan(t, new RegExp(`\\bce (hôtel|homme|ordinateur|été|ami|avion)${NOT_AFTER}`, 'i')),
    buildDiagnostic: (q) => `You wrote "${q}" — masculine ce becomes cet before a vowel or mute h. This is for phonetic ease: cet hôtel, cet homme.`,
    correction: "cet …",
  },
];

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
  fired: { rule: GrammarRule; captured: CapturedSpan | null }[],
): string | null {
  if (fired.length === 0) return null;

  const applicable: { span: CapturedSpan; replacement: string }[] = [];
  for (const { rule, captured } of fired) {
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
      explanation: `Your phrase '${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' shows correct use of the passé composé — using a past tense is one of the clearest signs of progress beyond Foundation level.`,
    };
  }

  // Priority 2: giving a reason (parce que / car / puisque)
  const reasonPattern = /\b(parce que|car|puisque)\b/i;
  const reasonMatch = transcript.match(reasonPattern);
  if (reasonMatch && reasonMatch.index !== undefined) {
    const s = _sentenceAt(transcript, reasonMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'fluency' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' is your strongest moment — giving a reason is exactly what IGCSE Communication marks reward. Examiners look for justified opinions at every band.`,
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
      explanation: `Your use of '${word}' to link ideas shows you can organise your response logically — this is a mark booster at every level, including Foundation.`,
    };
  }

  // Priority 4: relative clause (qui/que/dont/où connecting clauses)
  const relPattern = /\b\w+ (qui|que|qu'|dont|où) \w+/i;
  const relMatch = transcript.match(relPattern);
  if (relMatch && relMatch.index !== undefined && isClean(relMatch.index, relMatch.index + relMatch[0].length)) {
    const s = _sentenceAt(transcript, relMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'grammar' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' uses a relative clause to connect ideas — this is a Core-to-Extended grammar marker that examiners reward.`,
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
      explanation: `Your ${isCond ? 'conditional' : 'future'} form in '${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' shows tense range beyond the present — exactly what Language marks reward.`,
    };
  }

  // Priority 6: subjunctive / hypothetical (kept last — advanced)
  const advancedPattern = /\b(il faut que|si j'avais|si j'étais|ce que j'aime|il me semble que|à mon avis|selon moi)\b/i;
  const advMatch = transcript.match(advancedPattern);
  if (advMatch && advMatch.index !== undefined) {
    const s = _sentenceAt(transcript, advMatch.index);
    return {
      span: { start: s.start, end: s.end, severity: 'strong', category: 'grammar' },
      explanation: `'${s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}' demonstrates an advanced grammatical structure — this is a strong indicator of Extended-band performance.`,
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
      explanation: `'${snippet}' communicates your point clearly and directly — effective communication is the foundation of the IGCSE mark scheme.`,
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

export function evaluate(transcript: string, question: Question): FeedbackV2 {
  const tier = classifyTier(transcript);
  if (tier === 0) return buildTier0Result();
  if (tier === 1) return buildTier1LocalResult(transcript);

  const t = transcript;
  const wordCount = t.trim().split(/\s+/).filter(Boolean).length;
  const fillers = _detectFillers(t);

  // Detect fired rules and extract quotes
  const firedRules = GRAMMAR_RULES.filter(rule => rule.test(t));
  const allErrors = firedRules.map(rule => {
    const captured = rule.capture?.(t) ?? null;
    return {
      theme: THEMES[rule.theme].label,
      themeKey: rule.theme,
      severity: rule.severity,
      diagnostic: rule.buildDiagnostic
        ? (captured ? rule.buildDiagnostic(captured.text) : THEMES[rule.theme].desc)
        : THEMES[rule.theme].desc,
      correction: rule.correction,
      quote: captured?.text ?? '',
      captured,
      rule,
      ruleId: rule.id,
    };
  });

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

  // Build v2 CoachingIssues with enriched teachMe from TEACHME_LIBRARY
  const issues: CoachingIssue[] = allErrors.map((err) => {
    const themeKey = err.themeKey;
    const libraryEntry = TEACHME_LIBRARY[err.ruleId] ?? {};

    const baseTeachMe: TeachMe = {
      rule: THEMES[themeKey]?.desc ?? err.diagnostic,
      why: libraryEntry.why ?? err.diagnostic,
      mnemonic: THEMES[themeKey]?.master_tip,
      examples: libraryEntry.examples ?? [{ fr: err.correction, en: 'Corrected form' }],
      advanced: libraryEntry.advanced,
      examinerNote: libraryEntry.examinerNote,
    };

    // High confidence if we captured the actual quote; medium if quote is empty
    const confidence = err.quote ? 0.95 : 0.70;
    const category = THEME_TO_CATEGORY[themeKey] ?? 'grammar';
    const severity = err.severity === 'major' ? 'major' : 'minor';

    return {
      id: err.ruleId,
      category,
      severity,
      quote: err.quote,
      // Carries the regex match's own offset (docs Stage 4 item 4) so
      // _buildTranscriptAnnotations never has to re-find the quote via
      // indexOf — the offset is known at match time, never guessed.
      span: err.captured
        ? { start: err.captured.start, end: err.captured.end, severity, category, issueId: err.ruleId }
        : undefined,
      diagnostic: err.diagnostic,
      correction: err.correction,
      marksImpact: err.severity === 'major' ? 2 : 1,
      teachMe: baseTeachMe,
      evidence: err.quote || undefined,
      sourceWords: err.quote ? err.quote.split(/\s+/) : undefined,
      confidence,
    } satisfies CoachingIssue;
  });

  // Sort by priority and select top priority
  const sortedIssues = [...issues].sort((a, b) => _priorityScore(b) - _priorityScore(a));
  const topPriorityIssue = sortedIssues[0];

  // Build transcript annotations and strongest moment
  const transcriptAnnotations = _buildTranscriptAnnotations(sortedIssues);
  const strongest = _findStrongestMoment(transcript, transcriptAnnotations);

  // Build avoidance report for offline path
  const avoidanceReport = detectAvoidance(transcript, question);

  // Tag avoidance entries with confidence and evidence
  const taggedAvoidance = avoidanceReport.map(entry => ({
    ...entry,
    confidence: 0.75,
    evidence: transcript.split(/\s+/).find(w => entry.observation.toLowerCase().includes(w.toLowerCase())) ?? undefined,
  }));

  // Build vocabulary V2 entries with evidence tags
  const rawVocabV2 = _buildVocabV2(transcript);
  const taggedVocabV2 = rawVocabV2.map(entry => ({
    ...entry,
    evidence: entry.basic,
    sourceWords: entry.basic.split(/\s+/),
    confidence: 0.88,
  }));

  // All-or-nothing (docs Stage 4 item 3): null when any fired rule can't be
  // safely rewritten — the individual corrections above still ship regardless.
  const improvedAnswer = _buildImprovedAnswer(
    transcript,
    allErrors.map(e => ({ rule: e.rule, captured: e.captured })),
  );

  // docs Stage 4 item 5: L1 demand verdict only — never a fabricated always-on prompt.
  const biggestOpportunity = _buildOfflineOpportunity(transcript, question);

  // docs Stage 4 item 6: scaffolds, not fabricated French — empty when the
  // question has no demands/keyVocab to build frames from.
  const demandLadder = _buildDemandLadder(question);

  const result: FeedbackV2 = {
    responseTier: tier,
    scores: { ...OFFLINE_PLACEHOLDER_SCORES },
    unscored: 'no_llm_offline',
    grammar: {
      critical: allErrors.filter(e => e.severity === "major").slice(0, 4).map(e => ({ theme: e.theme, severity: e.severity, msg: e.diagnostic, diagnostic: e.diagnostic, correction: e.correction })),
      polish:   allErrors.filter(e => e.severity === "minor").slice(0, 3).map(e => ({ theme: e.theme, severity: e.severity, msg: e.diagnostic, diagnostic: e.diagnostic, correction: e.correction })),
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
    ...(biggestOpportunity !== undefined ? { biggest_opportunity: biggestOpportunity } : {}),
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
