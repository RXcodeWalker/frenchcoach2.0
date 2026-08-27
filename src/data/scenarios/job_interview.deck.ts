import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- job_interview`'s
 * word list (417 candidates from the full graph — a large, pre-existing
 * deeply-branched graph). Scoped to the core interview beats covered by the
 * `interview` branch's missions (introduction, motivation, strengths,
 * salary, onboarding). register is 'formal' to match job_interview's
 * npc.register.
 */
export const jobInterviewDeck: ScenarioDeck = {
  entries: [
    {
      fr: "l'entretien", en: 'interview', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'le parcours', en: 'background / career path', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_introduction'], rank: 'core',
    },
    {
      fr: 'Qu\'est-ce qui vous attire particulièrement dans notre entreprise ?', en: 'What particularly attracts you to our company?',
      pos: 'question', register: 'formal', usedInStates: ['ask_motivation'], rank: 'core',
    },
    {
      fr: 'les qualités', en: 'strengths / qualities', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les qualités',
      register: 'neutral', usedInStates: ['ask_strengths'], rank: 'core',
    },
    {
      fr: 'les prétentions salariales', en: 'salary expectations', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les prétentions salariales',
      register: 'neutral', usedInStates: ['ask_salary_expectations'], rank: 'core',
    },
    {
      fr: 'disponible', en: 'available', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_onboarding'], rank: 'core',
    },
    {
      fr: 'Pouvez-vous vous présenter brièvement ?', en: 'Can you introduce yourself briefly?',
      pos: 'question', register: 'formal', usedInStates: ['ask_introduction'], rank: 'core',
    },
    {
      fr: "Qu'est-ce qui vous attire dans ce poste ?", en: 'What attracts you to this position?',
      pos: 'question', register: 'formal', usedInStates: ['ask_motivation'], rank: 'core',
    },
    {
      fr: 'Quelles sont vos trois principales qualités ?', en: 'What are your three main strengths?',
      pos: 'question', register: 'formal', usedInStates: ['ask_strengths'], rank: 'core',
    },
    {
      fr: 'Quelles sont vos prétentions salariales ?', en: 'What are your salary expectations?',
      pos: 'question', register: 'formal', usedInStates: ['ask_salary_expectations'], rank: 'core',
    },
    {
      fr: 'Bonne chance pour la suite.', en: 'Good luck going forward.',
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: "l'expérience", en: 'experience', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['ask_introduction'], rank: 'extend',
    },
    {
      fr: "le défaut", en: 'weakness / flaw', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_weakness'], rank: 'extend',
    },
    {
      fr: "l'intégration", en: 'onboarding', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['ask_onboarding'], rank: 'extend',
    },
    {
      fr: 'le télétravail', en: 'remote work', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_remote_work'], rank: 'extend',
    },
    {
      fr: "les références", en: 'references', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les références',
      register: 'neutral', usedInStates: ['ask_references'], rank: 'extend',
    },
    {
      fr: "postuler", en: 'to apply (for a job)', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_motivation'], rank: 'extend',
    },
  ],
};
