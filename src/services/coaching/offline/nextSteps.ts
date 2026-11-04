/**
 * Offline "Go further": concrete next steps for THIS answer and THIS question,
 * plus vocabulary to vary for words the learner leaned on.
 *
 * Every next step is phrased as an invitation to add something, never as a
 * verdict that something is missing: a detector miss is "not detected", not
 * "not done" (diagnosticEngine.findMarker, satisfaction.ts), so the copy says
 * "add a reason", not "you gave no reason". Steps are chosen from what the
 * question invites (its tagged demands, when it has them) and what the
 * markers did not pick up, most useful first.
 */
import type { Question, VocabularyEntry } from '../../../types';
import { findMarker } from '../diagnosticEngine';
import { RESPONSE_LOAD_MIN_WORDS } from '../../../domain/learn/demand/satisfaction';
import { FR_LETTER, NOT_BEFORE } from '../regexBoundary';
import type { EnglishRun } from './englishCheck';

export const MAX_NEXT_STEPS = 3;

export const NEXT_STEP_COPY = {
  english: (runs: string[]) =>
    `Say ${runs.map((r) => `« ${r} »`).join(' and ')} in French next time — if a word won't come, describe it with words you know.`,
  past: "This question invites the past — add a past-tense sentence: « Le week-end dernier, je suis allé(e)… » or « C'était… ».",
  future: "This question invites the future — add a plan: « L'année prochaine, je vais… » or « Plus tard, je voudrais… ».",
  conditional: "This question invites a 'would' answer — try « Si j'avais le choix, je … » or « J'aimerais… ».",
  timeRange: "Add a different time frame — something you did (« l'année dernière, j'ai… ») or will do (« je vais… »).",
  reason: 'Add a reason to your main point: « … parce que c\'est … » or « … car … ».',
  opinion: 'Give your own opinion: « À mon avis, … » or « Je trouve que … ».',
  length: (target: number) => `Aim for about ${target} words — add one more detail: who with, when, or where.`,
  connectors: 'Link your ideas with « de plus », « cependant » or « par contre » instead of only « et ».',
} as const;

function wordsIn(transcript: string): number {
  return transcript.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Up to MAX_NEXT_STEPS invitations for this answer, most useful first.
 * `untranslated` are English runs the glossary could not translate.
 */
export function buildNextSteps(transcript: string, question: Question | undefined, untranslated: EnglishRun[]): string[] {
  const steps: string[] = [];
  const add = (s: string) => {
    if (steps.length < MAX_NEXT_STEPS && !steps.includes(s)) steps.push(s);
  };

  if (untranslated.length > 0) add(NEXT_STEP_COPY.english(untranslated.slice(0, 2).map((r) => r.text)));

  const demands = question?.demands;
  const hasPast = findMarker(transcript, 'past') !== null;
  const hasFuture = findMarker(transcript, 'future') !== null;
  const hasConditional = findMarker(transcript, 'conditional') !== null;

  if (demands) {
    if (demands.timeFrames.includes('past') && !hasPast) add(NEXT_STEP_COPY.past);
    if (demands.timeFrames.includes('future') && !hasFuture && !hasConditional) add(NEXT_STEP_COPY.future);
    if (demands.timeFrames.includes('conditional') && !hasConditional) add(NEXT_STEP_COPY.conditional);
  } else if (!hasPast && !hasFuture && !hasConditional) {
    add(NEXT_STEP_COPY.timeRange);
  }

  if (findMarker(transcript, 'justification') === null) add(NEXT_STEP_COPY.reason);

  const opinionInvited = !demands || demands.cognitiveDemand !== 'describe' || demands.structures.includes('opinion');
  if (opinionInvited && findMarker(transcript, 'opinion') === null) add(NEXT_STEP_COPY.opinion);

  const words = wordsIn(transcript);
  const target = demands ? RESPONSE_LOAD_MIN_WORDS[demands.responseLoad] : RESPONSE_LOAD_MIN_WORDS.developed;
  if (words < target) add(NEXT_STEP_COPY.length(target));

  if (words >= 15 && findMarker(transcript, 'connectors') === null) add(NEXT_STEP_COPY.connectors);

  return steps;
}

// ── Words the learner leaned on ──────────────────────────────────────────────

interface RepeatRule {
  word: string;
  /** How many uses before it reads as repetitive. */
  min: number;
  upgrades: VocabularyEntry['upgrades'];
}

const REPEAT_RULES: RepeatRule[] = [
  {
    word: 'très',
    min: 3,
    upgrades: [
      { phrase: 'vraiment', level: 'B1', nuance: 'A natural swap for one of them' },
      { phrase: 'particulièrement', level: 'B2', nuance: 'More precise emphasis' },
    ],
  },
  {
    word: 'aussi',
    min: 3,
    upgrades: [
      { phrase: 'également', level: 'B1', nuance: 'Same meaning, more formal' },
      { phrase: 'de plus', level: 'B1', nuance: 'Starts a new point' },
    ],
  },
  {
    word: 'et',
    min: 5,
    upgrades: [
      { phrase: 'ensuite', level: 'B1', nuance: 'For a sequence of events' },
      { phrase: 'de plus', level: 'B1', nuance: 'For adding another point' },
    ],
  },
  {
    word: "c'est",
    min: 4,
    upgrades: [
      { phrase: 'je trouve que', level: 'B1', nuance: 'Turns a statement into your opinion' },
      { phrase: 'ce qui me plaît, c\'est…', level: 'B2', nuance: 'Varies the sentence shape' },
    ],
  },
  {
    word: 'intéressant',
    min: 2,
    upgrades: [
      { phrase: 'passionnant', level: 'B1', nuance: 'Stronger — really gripping' },
      { phrase: 'enrichissant', level: 'B2', nuance: 'You learn something from it' },
    ],
  },
  {
    word: 'bien',
    min: 3,
    upgrades: [
      { phrase: 'génial', level: 'B1', nuance: 'More enthusiastic (informal)' },
      { phrase: 'agréable', level: 'B1', nuance: 'Pleasant — calmer' },
    ],
  },
];

/** A vocabulary entry for each word used at or above its repeat threshold, quoting the word as written. */
export function buildRepetitionVocab(transcript: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  for (const rule of REPEAT_RULES) {
    const escaped = rule.word.replace("'", "['’]");
    const re = new RegExp(`${NOT_BEFORE}${escaped}(?![${FR_LETTER}])`, 'gi');
    const matches = [...transcript.matchAll(re)];
    if (matches.length < rule.min) continue;
    const basic = matches[0][0];
    entries.push({
      basic,
      tier: 'repetitive',
      upgrades: rule.upgrades.map((u) => ({ ...u, nuance: `${u.nuance} — you used « ${basic} » ${matches.length} times` })),
      evidence: basic,
      sourceWords: [basic],
      confidence: 0.9,
    });
  }
  return entries;
}
