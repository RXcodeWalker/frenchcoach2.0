/**
 * S10 original SessionQuestionSet fixtures — modelled on Cambridge 0520 Paper 3
 * structure (5 role-play tasks including one PAUSE two-part task; two topic
 * conversations of 5 questions each, alternatives on Q3-Q5, a two-part Q4 whose
 * follow-up is delivered as a distinct secondPartText). All text is
 * original practice material, NOT derived from confidential TN booklets.
 * Full bank authoring (many sets, teacher-reviewed) stays with S11 — this is
 * a minimal fixture so the S10 engine has something concrete to drive.
 */

import type { SessionQuestionSet } from '../../domain/igcse/session/types';

export const ORIGINAL_QUESTION_SET_1: SessionQuestionSet = {
  questionSetId: 'original-practice-001',
  questions: [
    // ── Role play (5 tasks, TN instruction style) ──────────────────────────
    {
      questionId: 'rp1',
      part: 'rolePlay',
      mainText: 'Saluez le vendeur et demandez un billet pour Paris.',
      alternativeTexts: [],
    },
    {
      questionId: 'rp2',
      part: 'rolePlay',
      mainText: 'Dites à quelle heure vous voulez partir.',
      alternativeTexts: [],
    },
    {
      questionId: 'rp3',
      part: 'rolePlay',
      mainText: 'Demandez le prix du billet.',
      alternativeTexts: [],
      partsExpected: 2,
      secondPartText: "Demandez aussi s'il y a une réduction pour les étudiants.",
    },
    {
      questionId: 'rp4',
      part: 'rolePlay',
      mainText: "Dites que vous voulez payer par carte.",
      alternativeTexts: [],
    },
    {
      questionId: 'rp5',
      part: 'rolePlay',
      mainText: 'Remerciez le vendeur et dites au revoir.',
      alternativeTexts: [],
    },
    // ── Topic 1 (Everyday Life, topic area A) ──────────────────────────────
    {
      questionId: 't1q1',
      part: 'topic1',
      mainText: 'Que fais-tu pour aider à la maison ?',
      alternativeTexts: [],
      topicArea: 'A',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't1q2',
      part: 'topic1',
      mainText: 'Décris ta maison ou ton appartement.',
      alternativeTexts: [],
      topicArea: 'A',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't1q3',
      part: 'topic1',
      mainText: "Qu'est-ce que tu as fait le week-end dernier ?",
      alternativeTexts: ['Raconte ta dernière sortie en famille.'],
      topicArea: 'A',
      expectedTimeFrame: 'past',
    },
    {
      questionId: 't1q4',
      part: 'topic1',
      mainText: 'Préfères-tu manger à la maison ou au restaurant ?',
      secondPartText: 'Pourquoi ?',
      alternativeTexts: ['Quel est ton repas préféré ?'],
      topicArea: 'A',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't1q5',
      part: 'topic1',
      mainText: "Qu'est-ce que tu vas faire ce soir ?",
      alternativeTexts: ['Quels sont tes projets pour la semaine prochaine ?'],
      topicArea: 'A',
      expectedTimeFrame: 'future',
    },
    // ── Topic 2 (The World Around Us, topic area C) ────────────────────────
    {
      questionId: 't2q1',
      part: 'topic2',
      mainText: "Qu'est-ce que tu fais pour protéger l'environnement ?",
      alternativeTexts: [],
      topicArea: 'C',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't2q2',
      part: 'topic2',
      mainText: 'Décris ta ville ou ton village.',
      alternativeTexts: [],
      topicArea: 'C',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't2q3',
      part: 'topic2',
      mainText: 'As-tu déjà voyagé à l’étranger ? Raconte ce voyage.',
      alternativeTexts: ['Parle-moi de tes dernières vacances.'],
      topicArea: 'C',
      expectedTimeFrame: 'past',
    },
    {
      questionId: 't2q4',
      part: 'topic2',
      mainText: 'Penses-tu que le changement climatique est un problème grave ?',
      secondPartText: 'Pourquoi ?',
      alternativeTexts: ['Que penses-tu de la pollution dans les grandes villes ?'],
      topicArea: 'C',
      expectedTimeFrame: 'present',
    },
    {
      questionId: 't2q5',
      part: 'topic2',
      mainText: "Où voudrais-tu voyager à l'avenir ?",
      alternativeTexts: ['Comment imagines-tu ta vie dans dix ans ?'],
      topicArea: 'C',
      expectedTimeFrame: 'future',
    },
  ],
  // ── Authored on-topic "further question" padding (C2) ──────────────────
  // Asked only when a topic conversation falls short of the speaking floor
  // after Q1-Q5 are exhausted (see conductEngine MAX_FURTHER_QUESTIONS_PER_TOPIC).
  // Original, tu-register, on-topic material — not TN-sourced.
  furtherQuestions: {
    topic1: ['Est-ce que tu aides souvent tes parents à la maison ?', 'Quel est ton repas préféré en famille ?'],
    topic2: ["Qu'est-ce que ta ville pourrait faire pour être plus écologique ?", 'Aimerais-tu vivre dans une autre ville un jour ?'],
  },
};

export const ORIGINAL_QUESTION_SETS: SessionQuestionSet[] = [ORIGINAL_QUESTION_SET_1];

export function getOriginalQuestionSet(questionSetId: string): SessionQuestionSet | undefined {
  return ORIGINAL_QUESTION_SETS.find((qs) => qs.questionSetId === questionSetId);
}
