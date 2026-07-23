import type { AuthoredQuestionSet } from '../types';

/** A minimally valid, clean AuthoredQuestionSet — the baseline every malformed-fixture test mutates from. */
export function buildCleanSet(): AuthoredQuestionSet {
  return {
    questionSetId: 'test-set-1',
    schemaVersion: 'question-bank-v1',
    provenance: 'original-practice',
    review: { status: 'approved' },
    content: {
      rolePlay: {
        scenarioId: 'rp-test-1',
        topicArea: 'A',
        title: 'Test scenario',
        setup: 'Tu es a la gare et tu veux acheter un billet. Je suis le vendeur.',
        tasks: [
          { questionId: 'rp1', part: 'rolePlay', mainText: 'Saluez le vendeur.', alternativeTexts: [], partsExpected: 1 },
          { questionId: 'rp2', part: 'rolePlay', mainText: "Dites l'heure de depart.", alternativeTexts: [], partsExpected: 1 },
          {
            questionId: 'rp3',
            part: 'rolePlay',
            mainText: 'Demandez le prix.',
            alternativeTexts: [],
            partsExpected: 2,
            secondPartText: "Demandez s'il y a une reduction.",
          },
          { questionId: 'rp4', part: 'rolePlay', mainText: 'Dites que vous payez par carte.', alternativeTexts: [], partsExpected: 1 },
          { questionId: 'rp5', part: 'rolePlay', mainText: 'Remerciez le vendeur.', alternativeTexts: [], partsExpected: 1 },
        ],
      },
      topic1: {
        topicArea: 'A',
        subTopic: 'Everyday Life',
        furtherQuestions: ['Further Q1 for topic1', 'Further Q2 for topic1'],
        questions: [
          {
            questionId: 't1q1', part: 'topic1', mainText: 'Que fais-tu pour aider a la maison ?',
            alternativeTexts: [], topicArea: 'A', subTopic: 'Everyday Life', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't1q2', part: 'topic1', mainText: 'Decris ta maison.',
            alternativeTexts: [], topicArea: 'A', subTopic: 'Everyday Life', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't1q3', part: 'topic1', mainText: "Qu'est-ce que tu as fait le week-end dernier ?",
            alternativeTexts: ['Raconte ta derniere sortie.'], topicArea: 'A', subTopic: 'Everyday Life', difficulty: 'core',
            targetStructures: ['perfect'], expectedTimeFrame: 'past', partsExpected: 1,
          },
          {
            questionId: 't1q4', part: 'topic1', mainText: 'Preferes-tu manger a la maison ou au restaurant ?',
            secondPartText: 'Pourquoi ?', alternativeTexts: ['Quel est ton repas prefere ?'],
            topicArea: 'A', subTopic: 'Everyday Life', difficulty: 'core',
            targetStructures: ['opinion', 'justification'], expectedTimeFrame: 'present', partsExpected: 2,
          },
          {
            questionId: 't1q5', part: 'topic1', mainText: "Qu'est-ce que tu vas faire ce soir ?",
            alternativeTexts: ['Quels sont tes projets pour la semaine prochaine ?'],
            topicArea: 'A', subTopic: 'Everyday Life', difficulty: 'core',
            targetStructures: ['near-future'], expectedTimeFrame: 'future', partsExpected: 1,
          },
        ],
      },
      topic2: {
        topicArea: 'C',
        subTopic: 'The World Around Us',
        furtherQuestions: ['Further Q1 for topic2', 'Further Q2 for topic2'],
        questions: [
          {
            questionId: 't2q1', part: 'topic2', mainText: "Qu'est-ce que tu fais pour proteger l'environnement ?",
            alternativeTexts: [], topicArea: 'C', subTopic: 'The World Around Us', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't2q2', part: 'topic2', mainText: 'Decris ta ville.',
            alternativeTexts: [], topicArea: 'C', subTopic: 'The World Around Us', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't2q3', part: 'topic2', mainText: 'As-tu deja voyage a l’etranger ?',
            alternativeTexts: ['Parle-moi de tes dernieres vacances.'], topicArea: 'C', subTopic: 'The World Around Us', difficulty: 'core',
            targetStructures: ['perfect'], expectedTimeFrame: 'past', partsExpected: 1,
          },
          {
            questionId: 't2q4', part: 'topic2', mainText: 'Penses-tu que le changement climatique est un probleme grave ?',
            secondPartText: 'Pourquoi ?', alternativeTexts: ['Que penses-tu de la pollution ?'],
            topicArea: 'C', subTopic: 'The World Around Us', difficulty: 'higher',
            targetStructures: ['opinion', 'justification'], expectedTimeFrame: 'present', partsExpected: 2,
          },
          {
            questionId: 't2q5', part: 'topic2', mainText: "Ou voudrais-tu voyager a l'avenir ?",
            alternativeTexts: ['Comment imagines-tu ta vie dans dix ans ?'],
            topicArea: 'C', subTopic: 'The World Around Us', difficulty: 'core',
            targetStructures: ['conditional'], expectedTimeFrame: 'future', partsExpected: 1,
          },
        ],
      },
    },
  };
}
