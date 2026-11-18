/**
 * Public SEO content (docs/systems/public-seo-pages.md): the topic pages and
 * role-play example pages under /igcse-french-speaking/. Plain data, written for
 * the page — never read from the Learn question bank (that is ~2 MB and would
 * land in every visitor's download) and never from the exam bank (Exam Sim
 * must not reveal sets or role-play cards before the candidate starts —
 * exam-conduct §4).
 *
 * Authoring rules, all enforced by `__tests__/publicContent.test.ts`:
 *  - every `Highlight.fr` is a verbatim fragment of the answer it annotates;
 *  - each topic has exactly one answer of every `AnswerKind`;
 *  - sub-topics are the syllabus's own closed list (SUB_TOPICS_BY_AREA).
 */
import type { SubTopic, TopicArea } from '../exam/bank/types';

/**
 * The four shapes of question a topic conversation moves through: simple
 * present-tense description, then opinions with reasons, then the past, then
 * the future or "what if". One model answer per kind, per topic.
 */
export type AnswerKind = 'describe' | 'opinion' | 'past' | 'future';

export const ANSWER_KINDS: readonly AnswerKind[] = ['describe', 'opinion', 'past', 'future'];

export const ANSWER_KIND_LABEL: Readonly<Record<AnswerKind, string>> = {
  describe: 'Describing (present tense)',
  opinion: 'Giving an opinion and reasons',
  past: 'Talking about the past',
  future: 'Future plans and “what if”',
};

/** A fragment of a model answer, with one line on why it earns credit. */
export interface Highlight {
  /** Verbatim from the answer (checked by test). */
  fr: string;
  /** Plain English: what the fragment does for the examiner. */
  note: string;
}

export interface ModelAnswer {
  kind: AnswerKind;
  question: string;
  questionEn: string;
  answer: string;
  highlights: readonly Highlight[];
}

export interface VocabItem {
  fr: string;
  en: string;
}

export interface TopicPage {
  /** URL segment: /igcse-french-speaking/topics/<slug>. */
  slug: string;
  /** The Learn topic this page leads into (`/learn?topic=<learnKey>`) — checked against TOPICS. */
  learnKey: string;
  /** English page name, e.g. "School and education". */
  title: string;
  /** French label, as Learn shows it. */
  frTitle: string;
  /** Syllabus topic areas this topic sits in (Syl p.14). */
  areas: readonly TopicArea[];
  /** The closest syllabus sub-topics (the closed list, checked by test). */
  subTopics: readonly SubTopic[];
  /** Two or three sentences: why the topic matters and what to aim for. */
  intro: string;
  /** Practical tips for this topic (three). */
  tips: readonly string[];
  /** Exactly one per AnswerKind. */
  answers: readonly ModelAnswer[];
  /** Eight words to know. */
  vocab: readonly VocabItem[];
  /** Real Learn questions to try next — the French text only. */
  moreQuestions: readonly string[];
  /** Slugs of three related topics. */
  related: readonly string[];
}

/** One task of a practice role play, as the learner sees it in the Role-play drill. */
export interface RolePlayModelTask {
  taskId: number;
  /** A model reply, short and complete. */
  answer: string;
  /** Why this reply earns the marks (or what to notice in it). */
  note: string;
}

export interface RolePlayExample {
  slug: string;
  /** `ROLEPLAY_CARDS[].id` — the card's French lines and English task instructions are read from there. */
  cardId: string;
  /** English page name. */
  title: string;
  /** How the examiner addresses you in this card: staff you don't know → vous. */
  register: 'vous' | 'tu';
  /** Two or three sentences before the tasks. */
  intro: string;
  tasks: readonly RolePlayModelTask[];
  /** Phrases from the replies that work in many role plays. */
  phrases: readonly { fr: string; en: string }[];
  /** Slugs of two other examples. */
  related: readonly string[];
}
