import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. Like `car_rental`, `job_interview`'s `yes` (interview
 * confirmed) branch already had extensive `capture`/`intents` structure
 * authored into the graph before Stage 9 — a full multi-stage interview
 * flow (introduction, motivation, strengths/weaknesses, technical
 * assessment, salary, remote work, onboarding, references, availability,
 * candidate questions, conclusion) far beyond the plan's minimum bar. This
 * pass makes no graph changes; it only authors `.meta.ts` (missions
 * covering the core interview beats) and `.deck.ts`.
 */
export const jobInterviewMeta: ScenarioMeta = {
  id: 'job_interview',
  title: 'Job Interview',
  titleFr: "L'Entretien d'Embauche",
  emoji: '💼',
  tier: 3,
  category: 'Work',
  dependencies: [],
  npc: {
    nameFr: 'Recruteur',
    roleFr: 'le recruteur',
    roleEn: 'recruiter',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're at a job interview. Introduce yourself, explain your motivation, describe your strengths, discuss salary, then answer whether you're available to start.",
  branches: {
    yes: {
      labelEn: 'Go through the interview',
      missions: [
        {
          id: 'job_confirm_interview',
          en: "Say yes, you're here for the interview",
          modelFr: "Oui, c'est bien ça.",
          requires: [{ kind: 'intent', state: 'start', intent: 'yes' }],
        },
        {
          id: 'job_introduce_self',
          en: 'Introduce yourself and your background',
          modelFr: 'Je m\'appelle Camille et j\'ai cinq ans d\'expérience dans la vente.',
          requires: [{ kind: 'slot', state: 'ask_introduction', slot: 'candidate_intro', minWords: 5 }],
        },
        {
          id: 'job_say_motivation',
          en: 'Say why you want this job',
          modelFr: "Ce poste m'intéresse parce que j'aime le contact client.",
          requires: [{ kind: 'slot', state: 'ask_motivation', slot: 'motivation', minWords: 4 }],
        },
        {
          id: 'job_say_strengths',
          en: 'Say your main strengths',
          modelFr: 'Je suis organisé, patient et motivé.',
          requires: [{ kind: 'slot', state: 'ask_strengths', slot: 'strengths', minWords: 3 }],
        },
        {
          id: 'job_say_salary',
          en: 'Say your salary expectations',
          modelFr: "J'aimerais un salaire autour de 28 000 euros par an.",
          requires: [{ kind: 'slot', state: 'ask_salary_expectations', slot: 'salary_expectations', minWords: 3 }],
        },
        {
          id: 'job_accept_onboarding',
          en: "Say yes, you're available to start",
          modelFr: 'Oui, je suis disponible pour commencer le mois prochain.',
          requires: [{ kind: 'intent', state: 'ask_onboarding', intent: 'yes' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'ask_onboarding', intent: 'yes', terms: ['oui', 'disponible'], priority: 1 },
    { state: 'ask_onboarding', intent: 'no', terms: ['non'] },
  ],
};
