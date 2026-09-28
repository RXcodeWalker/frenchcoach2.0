import type { AuthoredQuestionSet } from '../types';

/**
 * A minimally valid, clean AuthoredQuestionSet — the baseline every
 * malformed-fixture test mutates from. Clean under the validator, the per-set
 * lint AND the authoring-only pattern lint (patternLint.ts), so a pattern test
 * can break exactly one rule and assert only that rule fires.
 */
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
        setup: 'Vous êtes à la gare et vous voulez acheter un billet. Je suis le vendeur.',
        examinerRegister: 'vous',
        tasks: [
          { questionId: 'rp1', part: 'rolePlay', mainText: 'Bonjour. Où voulez-vous aller ?', alternativeTexts: [], partsExpected: 1 },
          { questionId: 'rp2', part: 'rolePlay', mainText: 'Quand voulez-vous partir ?', alternativeTexts: [], partsExpected: 1 },
          {
            questionId: 'rp3',
            part: 'rolePlay',
            mainText: 'Pourquoi allez-vous à Paris ?',
            alternativeTexts: [],
            partsExpected: 2,
            secondPartText: "Qu'est-ce que vous allez visiter ?",
          },
          {
            questionId: 'rp4',
            part: 'rolePlay',
            mainText: 'Qu\'est-ce que vous avez fait pendant votre dernier voyage en train ?',
            alternativeTexts: [],
            partsExpected: 2,
            secondPartText: "C'était comment ?",
          },
          { questionId: 'rp5', part: 'rolePlay', mainText: 'Comment voulez-vous payer ?', alternativeTexts: [], partsExpected: 1 },
        ],
      },
      topic1: {
        topicArea: 'A',
        subTopic: 'Food and drink',
        title: 'La nourriture',
        furtherQuestions: ['Quel fruit aimes-tu le plus ?', 'Qui prépare les repas chez toi ?'],
        questions: [
          {
            questionId: 't1q1', part: 'topic1', mainText: 'Que manges-tu au petit-déjeuner ?',
            alternativeTexts: [], topicArea: 'A', subTopic: 'Food and drink', difficulty: 'foundation',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't1q2', part: 'topic1', mainText: 'Décris ton repas préféré.',
            alternativeTexts: [], topicArea: 'A', subTopic: 'Food and drink', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't1q3', part: 'topic1', mainText: "Qu'est-ce que tu as mangé le week-end dernier ?",
            alternativeTexts: ['Raconte ton dernier repas au restaurant.'], topicArea: 'A', subTopic: 'Food and drink', difficulty: 'core',
            targetStructures: ['perfect'], expectedTimeFrame: 'past', partsExpected: 1,
          },
          {
            questionId: 't1q4', part: 'topic1', mainText: 'Préfères-tu manger à la maison ou au restaurant ?',
            secondPartText: 'Pourquoi ?', alternativeTexts: ['Où aimes-tu manger ?', 'Pourquoi ?'],
            topicArea: 'A', subTopic: 'Food and drink', difficulty: 'core',
            targetStructures: ['opinion', 'justification'], expectedTimeFrame: 'present', partsExpected: 2,
          },
          {
            questionId: 't1q5', part: 'topic1', mainText: "Qu'est-ce que tu vas manger ce soir ?",
            alternativeTexts: ['Quel plat vas-tu préparer ce week-end ?'],
            topicArea: 'A', subTopic: 'Food and drink', difficulty: 'higher',
            targetStructures: ['near-future'], expectedTimeFrame: 'future', partsExpected: 1,
          },
        ],
      },
      topic2: {
        topicArea: 'C',
        subTopic: 'The natural world, the environment, the climate and the weather',
        title: "L'environnement",
        furtherQuestions: ['Quelle saison préfères-tu ?', "Que fais-tu pour économiser l'eau ?"],
        questions: [
          {
            questionId: 't2q1', part: 'topic2', mainText: "Qu'est-ce que tu fais pour protéger l'environnement ?",
            alternativeTexts: [], topicArea: 'C', subTopic: 'The natural world, the environment, the climate and the weather', difficulty: 'foundation',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't2q2', part: 'topic2', mainText: 'Décris le temps en hiver dans ta région.',
            alternativeTexts: [], topicArea: 'C', subTopic: 'The natural world, the environment, the climate and the weather', difficulty: 'core',
            targetStructures: ['present'], expectedTimeFrame: 'present', partsExpected: 1,
          },
          {
            questionId: 't2q3', part: 'topic2', mainText: 'Quel temps a-t-il fait pendant tes dernières vacances ?',
            alternativeTexts: ['Raconte une journée de pluie.'], topicArea: 'C', subTopic: 'The natural world, the environment, the climate and the weather', difficulty: 'core',
            targetStructures: ['perfect'], expectedTimeFrame: 'past', partsExpected: 1,
          },
          {
            questionId: 't2q4', part: 'topic2', mainText: 'Penses-tu que la pollution est un problème grave ?',
            secondPartText: 'Pourquoi ?', alternativeTexts: ['Que penses-tu de la pollution ?', 'Pourquoi ?'],
            topicArea: 'C', subTopic: 'The natural world, the environment, the climate and the weather', difficulty: 'core',
            targetStructures: ['opinion', 'justification'], expectedTimeFrame: 'present', partsExpected: 2,
          },
          {
            questionId: 't2q5', part: 'topic2', mainText: "Où voudrais-tu habiter à l'avenir ?",
            alternativeTexts: ['Comment imagines-tu ta ville dans dix ans ?'],
            topicArea: 'C', subTopic: 'The natural world, the environment, the climate and the weather', difficulty: 'higher',
            targetStructures: ['conditional'], expectedTimeFrame: 'conditional', partsExpected: 1,
          },
        ],
      },
    },
  };
}
