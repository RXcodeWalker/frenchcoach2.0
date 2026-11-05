// Questions that practise a skill. Kept out of `skillGraph.ts`, which Home and
// the coach read at startup, because it needs the whole question bank.

import { QUESTIONS } from '../../data/gameData';
import { inferQuestionMetadata } from '../content/questionMetadata';
import type { Question } from '../../types';

/** Questions whose inferred grammarFocus includes this diagnostic skill ID. */
export function getQuestionsPracticingSkill(skillId: string): Question[] {
  return QUESTIONS.filter(q => inferQuestionMetadata(q).grammarFocus.includes(skillId));
}
