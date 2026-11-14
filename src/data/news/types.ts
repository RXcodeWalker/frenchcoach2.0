/**
 * Daily News Flash ("Le Journal") content types — docs/systems/daily-news.md §1.
 *
 * The bank is hand-written and bundled: no AI writes a story at runtime, so every
 * French line can be recorded ahead of time in Henri's voice (scripts/tts/collectLines.ts,
 * source 'news'). The rules over this shape live in newsBankLint.ts.
 */

import type { WordId as QuestionWordId } from '../questionWords/types';

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

/** A listening-comprehension question, in English so it tests the ear, not reading. */
export interface NewsCheck {
  q: string;
  options: string[];
  answer: number;
  /** Index into `sentences` of the sentence that holds the answer (replayed on a miss). */
  sentence: number;
}

/** The story itself: what Henri reads (editions/*.ts). */
export interface NewsStoryLevel {
  headline: string;
  sentences: NewsSentence[];
  glossary: NewsGlossaryEntry[];
  /** Listening questions — used by Sunday's weekly quiz (daily-news §10). */
  check: NewsCheck[];
}

/** A French line with its English, for prompts shown with an English toggle. */
export interface NewsPrompt {
  fr: string;
  en: string;
}

/**
 * « Intox ou info ? » (daily-news §7): Henri reads the story again with sentence
 * `sentence` swapped for `fr`, one detail changed. The learner picks which
 * detail changed from `options` (English); `answer` is the right one.
 */
export interface NewsFake {
  sentence: number;
  fr: string;
  en: string;
  options: string[];
  answer: number;
}

export type InterviewKind = 'describe' | 'past' | 'future' | 'opinion';

export interface NewsInterviewQuestion extends NewsPrompt {
  kind: InterviewKind;
  /** 2–3 French ways to start the answer. */
  starters: string[];
  /** A short model answer, in role. */
  model: string;
}

/** « L'interview » (daily-news §7): the learner is someone in the story; Henri, the journalist, asks three questions. */
export interface NewsInterview {
  /** Who the learner plays, second person: « Tu es Léa, 14 ans, … ». */
  role: NewsPrompt;
  questions: NewsInterviewQuestion[];
}

export interface NewsDebateSide {
  starters: string[];
  model: string;
}

/** « Pour ou contre » (daily-news §7): argue one side of the story's issue, then the other. */
export interface NewsDebate {
  motion: NewsPrompt;
  for: NewsDebateSide;
  against: NewsDebateSide;
}

/** The show's segments for one level (segments/*.ts). */
export interface NewsLevelSegments {
  fake: NewsFake;
  interview: NewsInterview;
  debate: NewsDebate;
}

/** IGCSE topic areas (Cambridge 0520 syllabus): A everyday activities … E the international world. */
export type ExamTopicArea = 'A' | 'B' | 'C' | 'D' | 'E';

/** An edition's segments and links, kept apart from the story so a story's file stays readable. */
export interface NewsEditionSegments {
  examArea: ExamTopicArea;
  /** A core Learn topic key (data/topics.ts) the story leads into. */
  learnTopic?: string;
  levels: Record<NewsLevelId, NewsLevelSegments>;
}

/**
 * One goal of « Le journaliste, c'est toi » (daily-news §7): the learner asks
 * Henri, the anchor, a French question to get one fact for their article.
 * `journalistCheck.ts` hears whether the question uses `word`; Henri then
 * answers from the story, in the third person.
 */
export interface NewsJournalistTarget {
  /** In English, never naming the question word: « Find out when the train leaves. » */
  goal: string;
  /** The question word this goal needs (Question Detective's word ids). */
  word: QuestionWordId;
  /** A model question, shown in the review. */
  question: string;
  /** Henri's answer, true to the story (recorded, catalogue source `news`). */
  answer: NewsPrompt;
}

export interface NewsJournalist {
  targets: NewsJournalistTarget[];
}

export interface NewsPredictTurn extends NewsPrompt {
  starters: string[];
  model: string;
}

/**
 * « Et après ? » (daily-news §7): say what happens next (future), then what you
 * would do in their place (conditional at B1/B2). Henri then gives his own
 * guess — a guess, never presented as what really happened.
 */
export interface NewsPredict {
  next: NewsPredictTurn;
  ifYou: NewsPredictTurn;
  /** Henri's own prediction (recorded). */
  henri: NewsPrompt;
}

/** Phase 2 segments for one level (segments/reporter*.ts). */
export interface NewsReporterLevel {
  journalist: NewsJournalist;
  predict: NewsPredict;
}

export type NewsReporterSegments = Record<NewsLevelId, NewsReporterLevel>;

export interface NewsLevel extends NewsStoryLevel, NewsLevelSegments, NewsReporterLevel {}

export interface NewsStory {
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
   * False until a French speaker has checked every level, segments included
   * (content-authoring §16). Unreviewed editions still run (the bank would
   * otherwise be empty); the lint lists them as warnings.
   */
  reviewed: boolean;
  levels: Record<NewsLevelId, NewsStoryLevel>;
}

/** A story joined with its segments (data/news/index.ts) — what the show plays. */
export interface NewsEdition extends Omit<NewsStory, 'levels'> {
  examArea: ExamTopicArea;
  learnTopic?: string;
  levels: Record<NewsLevelId, NewsLevel>;
}
