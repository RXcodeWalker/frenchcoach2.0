/**
 * Question Detective content shapes (docs/systems/question-detective.md).
 * Closed, authored, no AI. Every accepted answer is 1–3 words and belongs to
 * exactly one answer type so a mix-up can be named.
 */

export const WORD_IDS = [
  'qui',
  'ou',
  'quand',
  'combien',
  'comment',
  'pourquoi',
  'quel',
  'questce',
] as const;

export type WordId = (typeof WORD_IDS)[number];

export const ANSWER_TYPES = [
  'person',
  'place',
  'time',
  'number',
  'manner',
  'reason',
  'choice',
  'thing',
] as const;

export type AnswerType = (typeof ANSWER_TYPES)[number];

export const WORD_TO_TYPE: Record<WordId, AnswerType> = {
  qui: 'person',
  ou: 'place',
  quand: 'time',
  combien: 'number',
  comment: 'manner',
  pourquoi: 'reason',
  quel: 'choice',
  questce: 'thing',
};

export const TYPE_TO_WORD: Record<AnswerType, WordId> = {
  person: 'qui',
  place: 'ou',
  time: 'quand',
  number: 'combien',
  manner: 'comment',
  reason: 'pourquoi',
  choice: 'quel',
  thing: 'questce',
};

/** Where the question word sits — kids often hear it at the end. */
export type WordPosition = 'end' | 'front' | 'estCeQue';

export const TOPICS = ['school', 'family', 'food', 'animals', 'home', 'hobbies'] as const;
export type Topic = (typeof TOPICS)[number];

export interface QuestionWord {
  id: WordId;
  /** The French word as shown on the toolkit card. */
  lemma: string;
  /** Extra spellings to highlight in a prompt (quelle, qu'est-ce que, …). */
  forms: readonly string[];
  /** English: "a person". */
  finds: string;
  /** Hint line: "this one wants a person". */
  hint: string;
  examples: readonly { prompt: string; position: WordPosition }[];
}

export interface DetectiveQuestion {
  id: string;
  wordId: WordId;
  prompt: string;
  gloss: string;
  position: WordPosition;
  answerType: AnswerType;
  /** 1–3 word answers; first is the model. */
  accepted: readonly string[];
  model: string;
  topic: Topic;
  /** Words of the prompt, for the Ask-it tile builder. */
  tiles: readonly string[];
}
