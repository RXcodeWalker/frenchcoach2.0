/**
 * Small builders for the Phase 2 segments (daily-news §7), so each level of
 * reporter*.ts stays a few readable lines. Pure data, no logic.
 */
import type { WordId } from '../../questionWords/types';
import type { NewsJournalistTarget, NewsPredict, NewsPredictTurn } from '../types';

/** One « Le journaliste, c'est toi » goal: English goal, the word it needs, a model question, Henri's answer (fr, en). */
export function ask(goal: string, word: WordId, question: string, fr: string, en: string): NewsJournalistTarget {
  return { goal, word, question, answer: { fr, en } };
}

/** One « Et après ? » prompt: French, English, 2–3 starters, a model answer. */
export function turn(fr: string, en: string, starters: string[], model: string): NewsPredictTurn {
  return { fr, en, starters, model };
}

export function predict(next: NewsPredictTurn, ifYou: NewsPredictTurn, henri: [fr: string, en: string]): NewsPredict {
  return { next, ifYou, henri: { fr: henri[0], en: henri[1] } };
}
