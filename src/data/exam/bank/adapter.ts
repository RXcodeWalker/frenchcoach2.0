/**
 * S11 adapter: AuthoredQuestionSet -> SessionQuestionSet. Pure, lossy
 * projection (same spirit as toSpeakingTranscript.ts) that flattens the
 * authored scenario + two topics into the flat SessionQuestionSet the
 * conduct engine already consumes, dropping operational metadata (review)
 * and non-scoring selection metadata (subTopic, difficulty, targetStructures).
 *
 * The conduct engine, projection, L1, L2, rubric, guardrails, and STT
 * annotator path do not change. Imports only types.ts + SessionQuestionSet;
 * does not validate or hash (component-boundary rule, §7).
 */

import type { SessionQuestion, SessionQuestionSet } from '../../../domain/igcse/session/types';
import type { AuthoredQuestion, AuthoredQuestionSet } from './types';

function toSessionQuestion(q: AuthoredQuestion): SessionQuestion {
  return {
    questionId: q.questionId,
    part: q.part,
    mainText: q.mainText,
    alternativeTexts: q.alternativeTexts,
    ...(q.topicArea !== undefined ? { topicArea: q.topicArea } : {}),
    ...(q.expectedTimeFrame !== undefined ? { expectedTimeFrame: q.expectedTimeFrame } : {}),
    partsExpected: q.partsExpected,
    ...(q.secondPartText !== undefined ? { secondPartText: q.secondPartText } : {}),
  };
}

/** Pure projection; does not validate (see validate.ts) or hash (see hashQuestionSet.ts). */
export function toSessionQuestionSet(set: AuthoredQuestionSet): SessionQuestionSet {
  const { rolePlay, topic1, topic2 } = set.content;
  return {
    questionSetId: set.questionSetId,
    questions: [
      ...rolePlay.tasks.map(toSessionQuestion),
      ...topic1.questions.map(toSessionQuestion),
      ...topic2.questions.map(toSessionQuestion),
    ],
    furtherQuestions: {
      topic1: topic1.furtherQuestions,
      topic2: topic2.furtherQuestions,
    },
  };
}
