/**
 * Daily News Flash ("Le Journal") content types — docs/systems/daily-news.md §1.
 *
 * The bank is hand-written and bundled: no AI writes a story at runtime, so every
 * French line can be recorded ahead of time in Henri's voice (scripts/tts/collectLines.ts,
 * source 'news'). The rules over this shape live in newsBankLint.ts.
 */

/** The three versions of every story. Shown to the learner as Easier / Standard / Harder. */
export type NewsLevelId = 'a2' | 'b1' | 'b2';

export const NEWS_LEVELS: readonly NewsLevelId[] = ['a2', 'b1', 'b2'];

/** Evergreen, kid-safe subject areas only (daily-news §1: no war, crime, disasters or politics). */
export type NewsTopicArea =
  | 'science'
  | 'space'
  | 'sport'
  | 'culture'
  | 'environment'
  | 'animals'
  | 'tech'
  | 'food'
  | 'people'
  | 'travel'
  | 'festival';

export interface NewsSentence {
  fr: string;
  en: string;
}

export interface NewsGlossaryEntry {
  /** As it appears in the story (a single word or a short phrase). */
  fr: string;
  en: string;
}

/**
 * One fact the learner's retelling should carry. Covered when EVERY group in
 * `cues` has at least one alternative in the transcript (daily-news §3), so a
 * fact can never be ticked by one lucky keyword. Alternatives are matched as
 * whole words after normalisation (case, accents, apostrophes, hyphens); an
 * alternative ending in `*` matches any word starting with it ("recycl*").
 */
export interface NewsFact {
  id: string;
  /** Shown on Review: what the fact is, in English. */
  en: string;
  /** Index into the level's `sentences` holding this fact (shown in French when missed). */
  sentence: number;
  cues: string[][];
}

/** A listening-comprehension question, in English so it tests the ear, not reading. */
export interface NewsCheck {
  q: string;
  options: string[];
  answer: number;
  /** Index into `sentences` of the sentence that holds the answer (replayed on a miss). */
  sentence: number;
}

export interface NewsLevel {
  headline: string;
  sentences: NewsSentence[];
  glossary: NewsGlossaryEntry[];
  facts: NewsFact[];
  check: NewsCheck[];
  opinion: { fr: string; en: string };
  /** 2–3 French sentence starters for the opinion. */
  starters: string[];
  /** A model French retelling, sent to the feedback engine as the model answer. */
  modelRetell: string;
}

export interface NewsEdition {
  /** Stable kebab-case id, e.g. `bees-on-roofs`. Never reused for another story. */
  id: string;
  topicArea: NewsTopicArea;
  emoji: string;
  /**
   * 'MM-DD' — this edition runs on that calendar day every year and is left
   * out of the ordinary rotation (daily-news §2).
   */
  pinDate?: string;
  /**
   * False until a French speaker has checked every level (content-authoring §16).
   * Unreviewed editions still run (the bank would otherwise be empty); the lint
   * lists them as warnings.
   */
  reviewed: boolean;
  levels: Record<NewsLevelId, NewsLevel>;
}
