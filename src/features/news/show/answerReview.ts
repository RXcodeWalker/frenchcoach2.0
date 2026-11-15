/**
 * The review of a news segment, answer by answer — docs/systems/daily-news.md §8.
 * Pure and deterministic: no AI call, no mark.
 *
 * A segment makes one feedback call over the learner's answers joined
 * (segmentFeedback.ts). Showing that reply as one block mixed every answer
 * together (owner report 2026-11-15), so each fix is placed back under the
 * answer it quotes, and "Say it better" is that answer with its own fixes
 * applied: nothing the learner did not say is invented.
 *
 * The checks under each answer are exam habits, not marks: whether the fact
 * the question needed is there (the fact sheet, daily-news §7), the tense the
 * question asked for, a reason for an opinion, and whether the answer is very
 * short. The tense and reason markers are "reliable presence, unreliable
 * absence" (diagnosticEngine.ts), so a miss is worded as a suggestion, never
 * as "you didn't".
 */
import type { NewsFact } from '../../../data/news/types';
import type { FeedbackPoint } from '../../feedback/components/FeedbackPointList';
import { findMarker } from '../../../services/coaching/diagnosticEngine';
import { phraseOccurs } from '../newsMatch';

export type Fix = Extract<FeedbackPoint, { kind: 'fix' }>;

/** The exam habit a turn asks for. */
export type Habit = 'past' | 'future' | 'reason';

/** Below this many words, an answer gets "say a bit more". */
export const SHORT_ANSWER_WORDS = 8;

export interface AnswerCheck {
  key: string;
  /** True: shown with a tick. False: shown as a suggestion. */
  met: boolean;
  label: string;
  detail: string;
}

/** What a turn needs for its checks (a subset of SegmentTurn). */
export interface CheckableTurn {
  habit?: Habit;
  fact?: NewsFact;
  /** The whole fact sheet, so an extra fact the learner used is noticed too. */
  sheet?: readonly NewsFact[];
  starters: readonly string[];
}

export function factUsed(fact: NewsFact, text: string): boolean {
  return fact.keywords.some(k => phraseOccurs(text, k));
}

function words(text: string): number {
  return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

/** The marker that shows a habit, quoted as heard, or null. */
function habitHit(habit: Habit, text: string): { quote: string } | null {
  if (habit === 'reason') return findMarker(text, 'justification');
  if (habit === 'past') return findMarker(text, 'past');
  return findMarker(text, 'future') ?? findMarker(text, 'conditional');
}

/** True when `text` shows the habit (the bank lint holds every fact-sheet model answer to it). */
export function showsHabit(habit: Habit, text: string): boolean {
  return habitHit(habit, text) !== null;
}

function habitCheck(habit: Habit, text: string, starter: string | undefined): AnswerCheck {
  const hit = habitHit(habit, text);
  if (habit === 'reason') {
    return hit
      ? { key: 'reason', met: true, label: 'A reason', detail: `« ${hit.quote} »` }
      : { key: 'reason', met: false, label: 'Add a reason', detail: 'An opinion counts for more with a reason: parce que…, car…' };
  }
  if (habit === 'past') {
    return hit
      ? { key: 'past', met: true, label: 'Past tense', detail: `« ${hit.quote} »` }
      : { key: 'past', met: false, label: 'Try the past', detail: `This question is about the past${starter ? `: « ${starter} »` : '.'}` };
  }
  return hit
    ? { key: 'future', met: true, label: 'Future', detail: `« ${hit.quote} »` }
    : { key: 'future', met: false, label: 'Try the future', detail: `This question is about what comes next${starter ? `: « ${starter} »` : '.'}` };
}

/** The checks under one answer. An empty (skipped) answer gets none. */
export function answerChecks(turn: CheckableTurn, answer: string): AnswerCheck[] {
  const text = answer.trim();
  if (!text) return [];
  const checks: AnswerCheck[] = [];
  if (turn.fact) {
    checks.push(
      factUsed(turn.fact, text)
        ? { key: 'fact', met: true, label: 'Used the fact sheet', detail: turn.fact.note }
        : { key: 'fact', met: false, label: 'Use the fact sheet', detail: `It says: ${turn.fact.note}` },
    );
  }
  const extra = (turn.sheet ?? []).filter(f => f.id !== turn.fact?.id && factUsed(f, text));
  if (extra.length > 0) {
    checks.push({ key: 'extra', met: true, label: 'Extra detail from the sheet', detail: extra.map(f => f.label).join(', ') });
  }
  if (turn.habit) checks.push(habitCheck(turn.habit, text, turn.starters[0]));
  if (words(text) < SHORT_ANSWER_WORDS) {
    checks.push({ key: 'short', met: false, label: 'Say a bit more', detail: 'Add one more detail with et, aussi or mais.' });
  }
  return checks;
}

/** A quote as a pattern over the answer: any case, any run of spaces, either apostrophe. */
function quotePattern(quote: string): RegExp | null {
  const core = quote.trim().replace(/^[\s«»"“”.,;:!?…]+|[\s«»"“”.,;:!?…]+$/gu, '');
  if (!core) return null;
  const source = core
    .split(/\s+/)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]"))
    .join('\\s+');
  return new RegExp(source, 'iu');
}

/** Which answer a quote comes from: the first that contains it, else -1. */
export function answerIndexOf(quote: string, answers: readonly string[]): number {
  const re = quotePattern(quote);
  if (!re) return -1;
  return answers.findIndex(a => re.test(a));
}

/** Each fix under the answer it quotes; a fix whose quote spans answers (or is in none) is `unplaced`. */
export function placeFixes(fixes: readonly Fix[], answers: readonly string[]): { byAnswer: Fix[][]; unplaced: Fix[] } {
  const byAnswer: Fix[][] = answers.map(() => []);
  const unplaced: Fix[] = [];
  for (const fix of fixes) {
    const i = answerIndexOf(fix.quote, answers);
    if (i < 0) unplaced.push(fix);
    else byAnswer[i].push(fix);
  }
  return { byAnswer, unplaced };
}

/**
 * The answer with its fixes applied, in order (each replaces the first place
 * its quote still occurs). Null when nothing changed.
 */
export function applyFixes(answer: string, fixes: readonly Fix[]): string | null {
  let out = answer;
  for (const fix of fixes) {
    const re = quotePattern(fix.quote);
    if (!re || !fix.correction.trim()) continue;
    out = out.replace(re, () => fix.correction.trim());
  }
  return out === answer ? null : out;
}
