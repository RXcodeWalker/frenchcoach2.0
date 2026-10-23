/**
 * collectLines.ts — every fixed French line the app can play as a recording
 * (recorded-voices plan §4.3). `recordVoices.ts` records exactly this list;
 * `__tests__/catalogueCoverage.test.ts` drives the real conduct engine to
 * prove the exam can never say a line that is missing from it.
 *
 * Only static, authored text belongs here. AI-written French (Story, Visual
 * Novel, feedback sentences) and English never do: those stay on the browser
 * voice.
 */

import { OFFLINE_FIXTURES } from '../../src/data/exam/bank/fixtures';
import type { AuthoredQuestion, AuthoredQuestionSet } from '../../src/data/exam/bank/types';
import {
  AUTHORIZED_EXTENSION_PROMPTS,
  EXAM_CLOSING_TEXT,
  TRANSITION_MARKERS,
} from '../../src/domain/igcse/session/conductEngine';
import { GREETING_TEXT, ROLE_PLAY_FINISHED_TEXT, topicAnnouncementText } from '../../src/screens/exam/examAnnouncements';
import { QUESTIONS } from '../../src/data/questions';
import { LISTENING_QUESTIONS } from '../../src/data/listeningQuestions';
import { SHADOWING_PHRASES } from '../../src/data/shadowingPhrases';
import { listScenarios } from '../../src/data/scenarios/registry';
import { normalizeSpokenText } from '../../src/services/tts/voiceKey';

export type LineSource = 'exam' | 'learn' | 'listening' | 'shadowing' | 'flashcards';

export interface CatalogueLine {
  /** The authored text, exactly as the app speaks it (and as Azure receives it). */
  text: string;
  /** Where it first came from — a line used in two places is listed once. */
  source: LineSource;
}

/**
 * Every line the examiner can speak for one set: what the UI speaks itself
 * (setup, topic announcements) plus every text the conduct engine can put in
 * `action.text` from the set (each part of a two-part question, every
 * alternative part, further questions).
 */
export function examSetLines(set: AuthoredQuestionSet): string[] {
  const { rolePlay, topic1, topic2 } = set.content;
  const questionLines = (q: AuthoredQuestion) => [
    q.mainText,
    ...(q.secondPartText !== undefined ? [q.secondPartText] : []),
    ...q.alternativeTexts,
  ];
  return [
    rolePlay.setup,
    ...rolePlay.tasks.flatMap(questionLines),
    topicAnnouncementText('topic1', topic1.title),
    ...topic1.questions.flatMap(questionLines),
    ...topic1.furtherQuestions,
    topicAnnouncementText('topic2', topic2.title),
    ...topic2.questions.flatMap(questionLines),
    ...topic2.furtherQuestions,
  ];
}

/**
 * Fixed lines that belong to no set: the UI's greeting and part boundary, and
 * every constant string the conduct engine emits (it never composes text — a
 * REPEAT re-reads the authored prompt verbatim, exam-conduct §8).
 */
export function examFixedLines(): string[] {
  return [
    GREETING_TEXT,
    ROLE_PLAY_FINISHED_TEXT,
    ...AUTHORIZED_EXTENSION_PROMPTS,
    ...TRANSITION_MARKERS,
    EXAM_CLOSING_TEXT,
  ];
}

/**
 * The whole catalogue, deduplicated by `normalizeSpokenText` (the key the
 * recording is stored under). Exam sets come from the bundled fixtures, which
 * `npm run authoring:parity` keeps identical to the backend's published bank.
 */
export function collectLines(): CatalogueLine[] {
  const bySource: [LineSource, string[]][] = [
    ['exam', [...examFixedLines(), ...Object.values(OFFLINE_FIXTURES).flatMap(examSetLines)]],
    ['learn', QUESTIONS.map((q) => q.text)],
    ['listening', LISTENING_QUESTIONS.map((q) => q.audioText)],
    ['shadowing', SHADOWING_PHRASES.map((p) => p.french)],
    // Scenario prep flashcards (FlashcardDeck speaks `fr`): authored decks, so static.
    ['flashcards', listScenarios().flatMap((s) => s.deck.entries.map((e) => e.fr))],
  ];

  const seen = new Set<string>();
  const lines: CatalogueLine[] = [];
  for (const [source, texts] of bySource) {
    for (const text of texts) {
      const key = normalizeSpokenText(text);
      if (key === '' || seen.has(key)) continue;
      seen.add(key);
      lines.push({ text, source });
    }
  }
  return lines;
}
