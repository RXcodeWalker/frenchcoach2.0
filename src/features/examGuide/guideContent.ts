/**
 * The exam guide's content (`/exam/guide`): how Paper 3 runs, how it is marked,
 * how to answer, and how to prepare in the app.
 *
 * Every number and every band descriptor is imported from the scoring
 * engine's own sourced data (`src/domain/igcse/rubric.ts`, TN pp.10–12) or
 * from the conduct spec's constants — never retyped — so the guide cannot
 * drift from what the scorer marks (CLAUDE.md rule 3). Structure and timings
 * are exam-conduct §1–§5, §8, §12–§15 (TN p.1, p.3, pp.5–8; Syl p.14, p.19).
 *
 * The French example answers and role-play questions are the app's own,
 * written for teaching. No Teacher's Notes script wording is reproduced
 * (the notes are confidential — exam-conduct "Sources").
 */
import {
  COMMUNICATION,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
  TOTAL_MARKS,
  CEFR_REFERENCE,
  PRINCIPLE_RP_CONCISE,
  type MarkBand,
} from '../../domain/igcse/rubric';
import { SUB_TOPICS_BY_AREA, type TopicArea } from '../../data/exam/bank/types';
import { LEARN_ANSWERS_PER_DAY } from '../learn/dailyAllowance';
import { EXAM_WINDOW_DAYS } from '../progress/progressSummary';

export { COMMUNICATION, QUALITY_OF_LANGUAGE, ROLE_PLAY, TOTAL_MARKS, CEFR_REFERENCE, PRINCIPLE_RP_CONCISE };
export type { MarkBand };
export { LEARN_ANSWERS_PER_DAY, EXAM_WINDOW_DAYS };

// ── Chapters ────────────────────────────────────────────────────────────────

export type ChapterId = 'exam' | 'marks' | 'rolePlay' | 'conversations' | 'app' | 'check';

export interface Chapter {
  id: ChapterId;
  title: string;
  /** One line under the title in the chapter list. */
  blurb: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: 'exam', title: 'The exam in 10 minutes', blurb: 'What happens, in what order' },
  { id: 'marks', title: 'How you’re marked', blurb: `Where the ${TOTAL_MARKS} marks come from` },
  { id: 'rolePlay', title: 'Role play', blurb: 'Short, complete, correct' },
  { id: 'conversations', title: 'Topic conversations', blurb: 'How to reach the top band' },
  { id: 'app', title: 'Preparing with FrenchCoach', blurb: 'Which mode, when, and why' },
  { id: 'check', title: 'Quick check', blurb: 'Six questions to lock it in' },
];

// ── Chapter 1: the parts of the test (exam-conduct §1–§5) ───────────────────

export interface ExamPart {
  id: string;
  label: string;
  /** Rough length, as the notes give it. */
  length: string;
  /** Minutes on the timeline bar (the notes' "about" values). */
  minutes: number;
  marked: boolean;
  summary: string;
  points: readonly string[];
}

export const EXAM_PARTS: readonly ExamPart[] = [
  {
    id: 'prep',
    label: 'Preparation',
    length: '10 min',
    minutes: 10,
    marked: false,
    summary: 'You get your role-play card and think about what you’ll say.',
    points: [
      'The card sets the scene for the role play and reminds you that two conversations follow.',
      'You may not write anything or use a dictionary. Plan in your head.',
      'You are not told the conversation topics. Nobody knows them in advance.',
    ],
  },
  {
    id: 'greeting',
    label: 'Greeting',
    length: 'about 30 s',
    minutes: 0.5,
    marked: false,
    summary: 'A short hello to settle you in. It isn’t marked.',
    points: [
      'From here on, everything is in French.',
      'You keep your role-play card until the end of the test.',
    ],
  },
  {
    id: 'rolePlay',
    label: 'Role play',
    length: 'about 2 min',
    minutes: 2,
    marked: true,
    summary: `The examiner plays a character from your card and asks you ${ROLE_PLAY.tasks} questions.`,
    points: [
      'Some questions come in two parts: the examiner waits for your answer, then asks the second part.',
      'If you didn’t catch a question, ask. It is repeated once, word for word, never rephrased.',
      'There are no alternative or extra questions in the role play.',
    ],
  },
  {
    id: 'topic1',
    label: 'Topic conversation 1',
    length: 'about 4 min',
    minutes: 4,
    marked: true,
    summary: 'Five questions on one topic from Area A or B, asked in order.',
    points: [
      'The examiner tells you the topic as the conversation starts.',
      'If the conversation is short, up to two further questions on the same topic bring it to about 4 minutes.',
    ],
  },
  {
    id: 'topic2',
    label: 'Topic conversation 2',
    length: 'about 4 min',
    minutes: 4,
    marked: true,
    summary: 'Five more questions on a different topic, from Area C, D or E.',
    points: [
      'Same shape as the first conversation, on a new topic.',
      'Your Communication and Quality of Language marks cover both conversations together.',
    ],
  },
];

/** Syllabus topic-area names (Syl p.14). */
export const TOPIC_AREA_NAMES: Record<TopicArea, string> = {
  A: 'Everyday activities',
  B: 'Personal and social life',
  C: 'The world around us',
  D: 'The world of work',
  E: 'The international world',
};

export const TOPIC_AREAS = (Object.keys(SUB_TOPICS_BY_AREA) as TopicArea[]).map((area) => ({
  area,
  name: TOPIC_AREA_NAMES[area],
  /** Which conversation this area can be used for (exam-conduct §21). */
  conversation: area === 'A' || area === 'B' ? 1 : 2,
  subTopics: SUB_TOPICS_BY_AREA[area] as readonly string[],
}));

// ── Chapter 2: the marks (rubric.ts) ─────────────────────────────────────────

export type CriterionId = 'rolePlay' | 'communication' | 'qualityOfLanguage';

export interface Criterion {
  id: CriterionId;
  name: string;
  max: number;
  /** In plain words: what the examiner is judging. */
  plain: string;
  covers: string;
}

export const CRITERIA: readonly Criterion[] = [
  {
    id: 'rolePlay',
    name: ROLE_PLAY.name,
    max: ROLE_PLAY.maxMarks,
    plain: `Did you get the message across, one task at a time? Up to ${ROLE_PLAY.marksPerResponse} marks for each of the ${ROLE_PLAY.tasks} answers.`,
    covers: 'The role play only',
  },
  {
    id: 'communication',
    name: COMMUNICATION.name,
    max: COMMUNICATION.maxMarks,
    plain: 'What you say: how well you understand and answer, how relevant you are, and how much you develop and explain your ideas.',
    covers: 'Both topic conversations together',
  },
  {
    id: 'qualityOfLanguage',
    name: QUALITY_OF_LANGUAGE.name,
    max: QUALITY_OF_LANGUAGE.maxMarks,
    plain: 'How you say it: the range and accuracy of your grammar and vocabulary, plus pronunciation and fluency.',
    covers: 'Both topic conversations together',
  },
];

/** The band a mark falls in (bands are contiguous, 0 is its own "no creditable response" band). */
export function bandFor(bands: readonly MarkBand[], mark: number): MarkBand {
  return bands.find((b) => mark >= b.min && mark <= b.max) ?? bands[bands.length - 1];
}

/**
 * Where in its band a mark sits, using the notes' own rule (TN p.11): the top
 * mark when the work convincingly meets the band, the middle when it
 * adequately does, the bottom when it just does.
 */
export function positionInBand(band: MarkBand, mark: number): 'convincingly' | 'adequately' | 'just' | null {
  if (band.min === band.max) return null;
  if (mark === band.max) return 'convincingly';
  if (mark === band.min) return 'just';
  return 'adequately';
}

export const POSITION_COPY = {
  convincingly: 'Top of the band: the work convincingly meets this description.',
  adequately: 'Middle of the band: the work adequately meets this description.',
  just: 'Bottom of the band: the work just meets this description.',
} as const;

// ── Chapter 3: mark it like an examiner (role play) ──────────────────────────

export interface RolePlayExample {
  id: string;
  question: string;
  questionEn: string;
  answer: string;
  mark: 0 | 1 | 2;
  why: string;
}

/** The app's own examples. The mark each one gets is the app's reading of TN p.10's descriptors. */
export const ROLE_PLAY_EXAMPLES: readonly RolePlayExample[] = [
  {
    id: 'stay',
    question: 'Vous restez combien de temps ?',
    questionEn: 'How long are you staying?',
    answer: 'Une semaine.',
    mark: 2,
    why: 'Two words, and the information is fully and correctly communicated. A short answer that does the job is worth full marks.',
  },
  {
    id: 'shower',
    question: 'Quelle sorte de chambre voulez-vous ?',
    questionEn: 'What sort of room would you like?',
    answer: 'Je voudrais une chambre pour deux personnes avec un douche.',
    mark: 2,
    why: '“un douche” should be “une douche”, but that is a minor slip and the message is clear. Minor errors are allowed for 2 marks.',
  },
  {
    id: 'yesterday',
    question: 'Qu’est-ce que vous avez fait hier ?',
    questionEn: 'What did you do yesterday?',
    answer: 'Je visite le musée.',
    mark: 1,
    why: 'The museum comes across, but in the present tense: did you go yesterday, or are you going now? The meaning is ambiguous, so it is partly communicated. “J’ai visité le musée” gets 2.',
  },
  {
    id: 'why',
    question: 'Pourquoi aimez-vous cette ville ?',
    questionEn: 'Why do you like this town?',
    answer: 'Euh… la ville… oui.',
    mark: 0,
    why: 'No reason is given, so nothing answers the task. That is “no creditable response”. Even “Parce qu’elle est belle” would score.',
  },
];

// ── Chapter 4: build a better answer ─────────────────────────────────────────

export interface AnswerStep {
  /** What this step adds, as a button label. */
  adds: string;
  /** The new French text, appended to the answer so far. */
  text: string;
  /** Why it helps, tied to the band descriptors. */
  why: string;
  /** Time frames the answer now covers. */
  tenses?: string;
}

export const LADDER_QUESTION = 'Qu’est-ce que vous faites pendant le week-end ?';
export const LADDER_QUESTION_EN = 'What do you do at the weekend?';

export const ANSWER_LADDER: readonly AnswerStep[] = [
  {
    adds: 'Start',
    text: 'Je joue au foot.',
    why: 'Relevant and correct, but it stops there. It gives the examiner one fact and nothing to reward beyond it.',
    tenses: 'Present',
  },
  {
    adds: 'Add detail',
    text: 'Le samedi matin, je joue au foot avec mes amis dans le parc.',
    why: 'When, who with and where. More information, still simple French.',
    tenses: 'Present',
  },
  {
    adds: 'Add an opinion and a reason',
    text: 'J’adore ça parce que c’est bon pour la santé et ça me détend.',
    why: 'The top Communication band asks you to develop ideas and opinions, and to justify and explain. “Parce que” is the easiest way to do it.',
    tenses: 'Present',
  },
  {
    adds: 'Add the past',
    text: 'Le week-end dernier, nous avons gagné un match. C’était génial !',
    why: 'Quality of Language rewards a range of structures. The perfect and imperfect tenses show it.',
    tenses: 'Present · past',
  },
  {
    adds: 'Add the future',
    text: 'Le week-end prochain, je vais aller au cinéma avec ma sœur.',
    why: 'A third time frame. Expect questions about the past and the future, so practise switching.',
    tenses: 'Present · past · future',
  },
  {
    adds: 'Add a complex sentence',
    text: 'Si j’avais plus de temps, je ferais aussi de la natation.',
    why: 'Si + imperfect + conditional: the kind of more complex language the top Quality of Language band mentions.',
    tenses: 'Present · past · future · conditional',
  },
];

/** "10–12" for the Communication band at `index` (0 = top), read from rubric.ts. */
function bandRange(index: number): string {
  const band = COMMUNICATION.bands[index];
  return `${band.min}–${band.max}`;
}

/** What happens when you can't answer a topic question (exam-conduct §12–§13) and what it costs. */
export const HELP_LADDER = [
  {
    step: 'Ask for a repeat',
    detail: 'The examiner repeats the question once, word for word.',
    band: 'Fine now and then: the top Communication band says you “may occasionally need repetition”.',
  },
  {
    step: 'An alternative question',
    detail: 'From question 3 on, if you still can’t answer, you get a simpler question on the same idea.',
    band: `Needing one occasionally fits the ${bandRange(1)} band. Needing them frequently points to ${bandRange(2)}.`,
  },
  {
    step: 'Moving on',
    detail: 'If that still gets no answer, the examiner goes on to the next question.',
    band: 'That question earns you nothing, so always try something, even a short answer.',
  },
] as const;

export interface Phrase {
  fr: string;
  en: string;
}

export const PHRASES: readonly { group: string; phrases: readonly Phrase[] }[] = [
  {
    group: 'When you need a moment',
    phrases: [
      { fr: 'Pouvez-vous répéter la question, s’il vous plaît ?', en: 'Could you repeat the question, please?' },
      { fr: 'Je n’ai pas bien compris.', en: 'I didn’t quite understand.' },
      { fr: 'Alors, voyons…', en: 'So, let’s see…' },
    ],
  },
  {
    group: 'Giving and explaining opinions',
    phrases: [
      { fr: 'À mon avis…', en: 'In my opinion…' },
      { fr: 'Ce qui me plaît, c’est que…', en: 'What I like is that…' },
      { fr: 'D’un côté…, de l’autre…', en: 'On the one hand…, on the other…' },
    ],
  },
  {
    group: 'Moving between time frames',
    phrases: [
      { fr: 'L’année dernière, je suis allé(e)…', en: 'Last year, I went…' },
      { fr: 'Quand j’étais petit(e)…', en: 'When I was little…' },
      { fr: 'À l’avenir, j’aimerais…', en: 'In the future, I’d like…' },
    ],
  },
];

// ── Chapter 5: the app ───────────────────────────────────────────────────────

/** exam-conduct §24, the rows a learner cares about. */
export const MODE_ROWS: readonly { label: string; sim: string; coached: string }[] = [
  { label: 'Preparation', sim: '10:00 countdown', coached: 'Start when ready' },
  { label: 'Topics before you start', sim: 'Hidden, like the real exam', coached: 'You can choose the set' },
  { label: 'Feedback during the exam', sim: 'None until the end', coached: 'After every answer' },
  { label: 'Typing and fixing your transcript', sim: 'No, microphone only', coached: 'Yes' },
  { label: `Mark out of ${TOTAL_MARKS}`, sim: 'Yes, and it counts on Progress', coached: 'Yes, as a practice mark' },
];

export const PRACTICE_ONLY_REASONS = [
  'Pressing “Start now” before the 10-minute preparation runs out.',
  'Reloading the page mid-exam and carrying on.',
] as const;

// ── Chapter 6: quick check ───────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: readonly string[];
  answer: number;
  explain: string;
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    id: 'total',
    question: 'How many marks is the speaking exam worth?',
    options: ['30', String(TOTAL_MARKS), '60'],
    answer: 1,
    explain: `${ROLE_PLAY.maxMarks} for the role play, ${COMMUNICATION.maxMarks} for Communication and ${QUALITY_OF_LANGUAGE.maxMarks} for Quality of Language.`,
  },
  {
    id: 'short',
    question: 'In the role play, a short answer that is complete and correct gets…',
    options: ['0 marks: too short', '1 mark', `${ROLE_PLAY.marksPerResponse} marks`],
    answer: 2,
    explain: 'Short is fine in the role play, as long as it fully communicates the information.',
  },
  {
    id: 'prep',
    question: 'During the 10 minutes of preparation you can…',
    options: ['Write notes', 'Use a dictionary', 'Read your role-play card and plan in your head'],
    answer: 2,
    explain: 'No writing and no dictionary. Use the time to think through each likely question on your card.',
  },
  {
    id: 'across',
    question: 'Communication and Quality of Language are marked…',
    options: ['Question by question', 'Across both topic conversations together', 'On the second conversation only'],
    answer: 1,
    explain: `Each is one mark out of ${COMMUNICATION.maxMarks} for both conversations, so your whole performance counts, not any single answer.`,
  },
  {
    id: 'repeat',
    question: 'You didn’t catch a conversation question. Best move?',
    options: ['Stay silent and wait', 'Ask the examiner to repeat it', 'Answer a different question'],
    answer: 1,
    explain: 'Asking for a repeat now and then is normal. Even the top band allows it.',
  },
  {
    id: 'counts',
    question: 'Which mode gives a mark that counts on your Progress page?',
    options: ['Exam Sim', 'Coached Practice', 'Both'],
    answer: 0,
    explain: 'Only Exam Sim runs under real conditions, so only its marks count. Coached marks are for practice.',
  },
];
