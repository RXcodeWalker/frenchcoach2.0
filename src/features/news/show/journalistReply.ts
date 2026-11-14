/**
 * What Henri does after the learner asks a « Le journaliste, c'est toi »
 * question (daily-news §7). Pure.
 *
 * The right question word → Henri answers from the story. A different word →
 * a nudge that names both words (what that word asks for, and the one this
 * goal needs), as Question Detective does. No question word → a nudge that
 * says what kind of answer the goal wants, without giving the word away.
 * Never "wrong": the learner asks again or moves on.
 */
import { questionWord } from '../../../data/questionWords/words';
import type { WordId } from '../../../data/questionWords/types';
import type { NewsJournalistTarget } from '../../../data/news/types';
import { checkJournalistQuestion } from './journalistCheck';

export type TurnResponse =
  | { kind: 'reply'; lead: string; fr: string; en: string }
  | { kind: 'nudge'; message: string };

export interface JournalistOutcome {
  response: TurnResponse;
  /** The word used instead of the right one, when there was a mix-up. */
  mixup: WordId | null;
}

function lemma(id: WordId): string {
  return questionWord(id)?.lemma ?? id;
}

function finds(id: WordId): string {
  return questionWord(id)?.finds ?? 'something';
}

export function journalistOutcome(target: NewsJournalistTarget, text: string): JournalistOutcome {
  const result = checkJournalistQuestion(text, target.word);
  if (result.verdict === 'right') {
    return { response: { kind: 'reply', lead: 'Bonne question !', fr: target.answer.fr, en: target.answer.en }, mixup: null };
  }
  if (result.verdict === 'mixup') {
    return {
      response: {
        kind: 'nudge',
        message: `« ${lemma(result.given)} » asks for ${finds(result.given)}. This goal needs ${finds(target.word)}: try « ${lemma(target.word)} ».`,
      },
      mixup: result.given,
    };
  }
  return {
    response: { kind: 'nudge', message: `We didn’t hear a question word. This goal needs ${finds(target.word)}: which word asks for that?` },
    mixup: null,
  };
}
