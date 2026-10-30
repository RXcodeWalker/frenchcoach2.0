/** Which way round the words go: French falls and English is typed, or the reverse. */
export type Direction = 'fr-en' | 'en-fr';

/** How long a word takes to fall at wave 1. */
export type Pace = 'relaxed' | 'steady' | 'quick';

export const DIRECTIONS: readonly Direction[] = ['fr-en', 'en-fr'];
export const PACES: readonly Pace[] = ['relaxed', 'steady', 'quick'];

export interface PoolWord {
  /** Normalised French — the identity of the word. */
  id: string;
  /** French as shown, cleaned of frames and punctuation. */
  fr: string;
  /** English as shown (first sense). */
  en: string;
  /** Normalised accepted English answers (typed when French falls). */
  enAnswers: string[];
  /** Normalised accepted French answers (typed when English falls). */
  frAnswers: string[];
  topicKey: string;
}

/** A word as the engine plays it, already resolved for one direction. */
export interface PlayWord {
  id: string;
  /** What falls. */
  text: string;
  /** What the learner types — normalised. The first is the main answer. */
  accept: string[];
  /** The answer as shown when the word is missed or cleared. */
  answer: string;
  /** What the learner is shown on the other side, for review. */
  fr: string;
  en: string;
  topicKey: string;
}
