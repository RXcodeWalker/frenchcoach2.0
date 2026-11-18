/**
 * "Common mistakes in IGCSE French speaking" (/igcse-french-speaking/common-mistakes).
 *
 * Hand-written, like the rest of src/data/seo (public-seo-pages §2). The four
 * themes are the ones the topic pages' highlight notes keep returning to:
 * agreement, être/avoir, tense choice and short answers. Each slip is a
 * sentence a learner might really say, next to its correction and one line
 * of plain English about the French.
 *
 * Rules, checked by `__tests__/mistakes.test.ts`:
 *  - every `example` is a verbatim highlight from the named topic page, so the
 *    page can show the real note beside it and link to where it comes from;
 *  - no `wrong` form appears in any model answer (the model answers must not
 *    contain the slips they are being compared with);
 *  - a note states a fact about French or about the marking, never a promise.
 */

export interface MistakeSlip {
  /** What a learner might say. */
  wrong: string;
  /** The corrected version. */
  right: string;
  /** Why, in plain English. */
  note: string;
}

export interface MistakeExample {
  /** Topic page slug (`TopicPage.slug`). */
  topic: string;
  /** A `Highlight.fr` from that topic's model answers, verbatim. */
  fr: string;
}

export interface Mistake {
  id: 'agreement' | 'etre-avoir' | 'tense' | 'short-answers';
  title: string;
  /** Two or three sentences: what goes wrong and why it is worth fixing. */
  lead: string;
  slips: readonly MistakeSlip[];
  /** What to do instead (short, concrete). */
  fix: readonly string[];
  /** Which mark this touches, in the exam guide's own words. */
  marks: string;
  examples: readonly MistakeExample[];
}

export const COMMON_MISTAKES: readonly Mistake[] = [
  {
    id: 'agreement',
    title: 'Agreement you can hear',
    lead:
      'Much French agreement is silent: allé, allée and allés sound the same, and so do parti and partie. So when you speak, the agreements that count are the ones that change the sound, mostly feminine adjectives and a few participles that end in a consonant. The rule is the same everywhere, so learn it once.',
    slips: [
      {
        wrong: 'Ma mère est content.',
        right: 'Ma mère est contente.',
        note: 'A feminine adjective adds a pronounced consonant: content, contente.',
      },
      {
        wrong: 'Ma cousine est grand.',
        right: 'Ma cousine est grande.',
        note: 'Same rule: grand, grande. The feminine -d is pronounced.',
      },
      {
        wrong: 'La jupe que j’ai pris était trop chère.',
        right: 'La jupe que j’ai prise était trop chère.',
        note: 'With avoir, the participle agrees with a direct object that comes before it (la jupe), and prise sounds different from pris.',
      },
    ],
    fix: [
      'Decide who or what the word describes before you say it, and let it agree.',
      'With être in the perfect tense the participle agrees with the subject (allé(e), parti(e)), but the spoken forms match, so what a listener hears is that you chose être.',
      'Check the sounds that change first: content/contente, grand/grande, pris/prise.',
    ],
    marks: 'Accuracy of grammar is part of the Quality of Language mark.',
    examples: [
      { topic: 'hobbies-and-free-time', fr: 'je suis allé(e)' },
      { topic: 'holidays-and-travel', fr: 'je suis parti(e)' },
      { topic: 'family-and-friends', fr: 'nous sommes allés' },
      { topic: 'jobs-and-work', fr: "que j'ai économisés" },
    ],
  },
  {
    id: 'etre-avoir',
    title: 'Être or avoir?',
    lead:
      'English uses “to be” where French uses avoir (age, pain), and “to have” where French uses être (verbs of movement, reflexive verbs in the perfect tense). Mixing them up is one of the most common slips, and one of the easiest to stop.',
    slips: [
      {
        wrong: 'Ma sœur est dix ans.',
        right: 'Ma sœur a dix ans.',
        note: 'Age uses avoir: J’ai quinze ans, not Je suis quinze ans.',
      },
      {
        wrong: 'Je suis mal aux dents.',
        right: 'J’ai mal aux dents.',
        note: 'Pain is avoir mal à + the body part.',
      },
      {
        wrong: 'J’ai allé au parc avec mes amis.',
        right: 'Je suis allé(e) au parc avec mes amis.',
        note: 'Aller is a verb of movement and takes être in the perfect tense.',
      },
      {
        wrong: 'Je suis amusé(e) au match.',
        right: 'Je me suis amusé(e) au match.',
        note: 'Reflexive verbs take être in the perfect tense, with the reflexive pronoun before it.',
      },
      {
        wrong: 'Mon père est un ingénieur.',
        right: 'Mon père est ingénieur.',
        note: 'After être, a job name used on its own takes no article.',
      },
    ],
    fix: [
      'Learn age and pain as fixed phrases with avoir: avoir … ans, avoir mal à.',
      'In the perfect tense, ask “is this a movement verb or a reflexive verb?” If yes, être; for most other verbs, avoir.',
      'Say « il est ingénieur », not « il est un ingénieur ».',
    ],
    marks: 'Accuracy of grammar is part of the Quality of Language mark.',
    examples: [
      { topic: 'family-and-friends', fr: 'Ma sœur a dix ans' },
      { topic: 'family-and-friends', fr: 'Mon père est ingénieur' },
      { topic: 'jobs-and-work', fr: 'Mon père est infirmier' },
      { topic: 'food-and-health', fr: 'j\'ai souvent mal aux dents' },
      { topic: 'hobbies-and-free-time', fr: 'nous avons patiné' },
      { topic: 'family-and-friends', fr: 'je me suis beaucoup amusé(e)' },
    ],
  },
  {
    id: 'tense',
    title: 'Choosing the right tense',
    lead:
      'A question that asks about yesterday needs a past-tense answer, and a question about next year needs the future. Answering in the present leaves the examiner unsure whether you understood. Within a past story, the perfect tense says what happened and the imperfect says how things were.',
    slips: [
      {
        wrong: 'Qu’est-ce que vous avez fait hier ? — Je visite le musée.',
        right: 'Qu’est-ce que vous avez fait hier ? — J’ai visité le musée.',
        note: 'The question is in the past (avez fait, hier), so the answer must be too. In the present it is unclear whether you went or are going.',
      },
      {
        wrong: 'Si j’aurais plus d’argent, j’achèterais une moto.',
        right: 'Si j’avais plus d’argent, j’achèterais une moto.',
        note: 'After si, use the imperfect, never the conditional. The conditional belongs in the other half of the sentence.',
      },
    ],
    fix: [
      'Listen for the time frame in the question (hier, le week-end dernier, demain, si on pouvait) and answer in the same one.',
      'In a story, use the perfect for each event (j’ai participé) and the imperfect for the background (c’était intéressant).',
      'Keep two ready-made patterns: si + imperfect + conditional (“what if”), and si + present + future (a real plan).',
    ],
    marks: 'A range of structures, used accurately, is part of the Quality of Language mark.',
    examples: [
      { topic: 'school', fr: 'j\'ai participé à' },
      { topic: 'school', fr: 'C\'était vraiment intéressant parce que' },
      { topic: 'clothes-and-fashion', fr: 'Si j\'avais plus d\'argent, j\'achèterais' },
      { topic: 'school', fr: 'Si j\'ai de bonnes notes, j\'irai' },
    ],
  },
  {
    id: 'short-answers',
    title: 'Answers that stop too soon',
    lead:
      'In the role play, a short answer is fine if it is complete and correct. In the topic conversations the opposite is true: a one-line answer gives the examiner little to credit. Adding a reason, a detail or a second side is what turns a correct answer into a developed one.',
    slips: [
      {
        wrong: 'Je joue au foot.',
        right: 'Le samedi matin, je joue au foot avec mes amis dans le parc.',
        note: 'When, who with and where: more information, still simple French.',
      },
      {
        wrong: 'Oui, j’aime ça.',
        right: 'Oui, parce que ça me détend et ça m’aide à oublier le stress.',
        note: 'Parce que plus a reason is the easiest way to justify an opinion.',
      },
    ],
    fix: [
      'After every opinion, say why: parce que, car, ce qui me plaît, c’est que.',
      'Add one more thing: a second reason (en plus, de plus) or the other side (d’un côté… de l’autre).',
      'If you get stuck, try something. A question that gets no answer earns nothing.',
    ],
    marks: 'Developing ideas, and giving reasons and explanations, is part of the Communication mark.',
    examples: [
      { topic: 'school', fr: 'D\'un côté' },
      { topic: 'hobbies-and-free-time', fr: 'En plus,' },
      { topic: 'sports-and-fitness', fr: 'Je pense que oui, parce que' },
      { topic: 'transport', fr: 'De plus,' },
    ],
  },
];
