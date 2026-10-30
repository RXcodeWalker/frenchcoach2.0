import { DEFAULT_STREAK_TIERS, getStreakMultiplier } from '../minigames/utils/getStreakMultiplier';
import { gradeFromStats, RUBRICS, type LetterGrade } from '../minigames/utils/gradeFromStats';
import { judgeAnswer } from './judge';
import type { RapidFireWord, WordLevel } from './wordBank';

/**
 * One Rapid Fire run as a pure state machine. The screen owns the clock (it
 * dispatches `tick` once a second) and the shuffle (`createRun` takes an
 * `rng`), so everything in here is deterministic and unit-tested.
 *
 * Points are a game score only. Rapid Fire does not award XP (owner, 2026-10-30):
 * nothing in this folder imports the XP or session services, and
 * `noXp.test.ts` keeps it that way.
 */

export const RUN_SECONDS = 60;
export const START_HEARTS = 3;
/** A wrong answer or a skip costs this many seconds. */
export const TIME_PENALTY = 2;
/** Every Nth correct answer in a row adds time… */
export const BONUS_EVERY = 5;
export const BONUS_SECONDS = 2;
/** …and every Nth also wins a lost heart back. */
export const HEART_EVERY = 10;
/** Time can bank above the starting 60s, but not without limit. */
export const MAX_SECONDS = RUN_SECONDS + 15;
export const BASE_POINTS = 10;
/** Correct answers needed to leave level 1, then level 2 (the ramp the deck follows). */
export const LEVEL_UP_AT: readonly [number, number] = [6, 14];

export type RunMode = 'sprint' | 'drill';
export type EndReason = 'time' | 'hearts' | 'cleared' | 'quit';
export type EntryKind = 'correct' | 'almost' | 'wrong' | 'skipped';

export interface RunEntry {
  word: RapidFireWord;
  typed: string;
  kind: EntryKind;
  /** The spelling that was shown or matched. */
  expected: string;
  accentsMissed: boolean;
}

export interface Feedback extends RunEntry {
  points: number;
  /** Seconds won (+) or lost (−) by this answer, bonus included. */
  timeDelta: number;
  /** A heart won back by this answer. */
  heartBack: boolean;
  /** Streak after this answer. */
  streak: number;
}

interface Deck {
  /** Remaining words per level (sprint) — one bucket in a drill. */
  buckets: RapidFireWord[][];
  /** Where a sprint deck refills from when every bucket is empty. */
  refill: RapidFireWord[][];
}

export interface RunState {
  mode: RunMode;
  phase: 'playing' | 'done';
  paused: boolean;
  timeLeft: number;
  hearts: number;
  score: number;
  streak: number;
  maxStreak: number;
  /** Counts of each outcome. */
  correct: number;
  almost: number;
  wrong: number;
  skipped: number;
  current: RapidFireWord;
  feedback: Feedback | null;
  log: RunEntry[];
  deck: Deck;
  endReason: EndReason | null;
}

export type RunAction =
  | { type: 'answer'; input: string }
  | { type: 'skip' }
  | { type: 'advance' }
  | { type: 'tick' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'quit' };

export function levelFor(correct: number): WordLevel {
  if (correct >= LEVEL_UP_AT[1]) return 3;
  if (correct >= LEVEL_UP_AT[0]) return 2;
  return 1;
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function bucketsOf(words: RapidFireWord[], mode: RunMode, rng: () => number): RapidFireWord[][] {
  if (mode === 'drill') return [shuffle(words, rng)];
  return [1, 2, 3].map(level => shuffle(words.filter(w => w.level === level), rng));
}

/** Takes the next word for `level`, easing to neighbouring levels when that one is spent. */
function draw(deck: Deck, mode: RunMode, level: WordLevel): { word: RapidFireWord | null; deck: Deck } {
  let buckets = deck.buckets;
  if (mode === 'drill') {
    const [word, ...rest] = buckets[0];
    return { word: word ?? null, deck: { ...deck, buckets: [rest] } };
  }
  if (buckets.every(b => b.length === 0)) buckets = deck.refill.map(b => [...b]);
  const want = level - 1;
  const order = [want, want - 1, want + 1, want - 2, want + 2].filter(i => i >= 0 && i < 3);
  const idx = order.find(i => buckets[i].length > 0);
  if (idx === undefined) return { word: null, deck: { ...deck, buckets } };
  const [word, ...rest] = buckets[idx];
  return { word, deck: { ...deck, buckets: buckets.map((b, i) => (i === idx ? rest : b)) } };
}

export function createRun(words: RapidFireWord[], mode: RunMode, rng: () => number = Math.random): RunState {
  const buckets = bucketsOf(words, mode, rng);
  const deck: Deck = { buckets, refill: buckets.map(b => [...b]) };
  const first = draw(deck, mode, 1);
  if (!first.word) throw new Error('Rapid Fire needs at least one word');
  return {
    mode,
    phase: 'playing',
    paused: false,
    timeLeft: RUN_SECONDS,
    hearts: START_HEARTS,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correct: 0,
    almost: 0,
    wrong: 0,
    skipped: 0,
    current: first.word,
    feedback: null,
    log: [],
    deck: first.deck,
    endReason: null,
  };
}

export function multiplierFor(streak: number): number {
  return getStreakMultiplier(streak, DEFAULT_STREAK_TIERS);
}

function finish(state: RunState, endReason: EndReason): RunState {
  return { ...state, phase: 'done', paused: false, feedback: null, endReason };
}

function settle(state: RunState, kind: EntryKind, typed: string, expected: string, accentsMissed: boolean): RunState {
  const word = state.current;
  let { streak, hearts, timeLeft, score } = state;
  let points = 0;
  let timeDelta = 0;
  let heartBack = false;

  if (kind === 'correct') {
    streak += 1;
    points = Math.round(BASE_POINTS * multiplierFor(streak));
    score += points;
    if (streak % BONUS_EVERY === 0) {
      const next = Math.min(MAX_SECONDS, timeLeft + BONUS_SECONDS);
      timeDelta = next - timeLeft;
      timeLeft = next;
    }
    if (streak % HEART_EVERY === 0 && hearts < START_HEARTS) {
      hearts += 1;
      heartBack = true;
    }
  } else if (kind === 'wrong') {
    streak = 0;
    hearts -= 1;
    timeDelta = -Math.min(TIME_PENALTY, timeLeft);
    timeLeft = Math.max(0, timeLeft + timeDelta);
  } else if (kind === 'skipped') {
    streak = 0;
    timeDelta = -Math.min(TIME_PENALTY, timeLeft);
    timeLeft = Math.max(0, timeLeft + timeDelta);
  }
  // "almost" is a free slip: no points, no penalty, and the streak holds.

  const feedback: Feedback = { word, typed, kind, expected, accentsMissed, points, timeDelta, heartBack, streak };
  const next: RunState = {
    ...state,
    streak,
    maxStreak: Math.max(state.maxStreak, streak),
    hearts,
    timeLeft,
    score,
    correct: state.correct + (kind === 'correct' ? 1 : 0),
    almost: state.almost + (kind === 'almost' ? 1 : 0),
    wrong: state.wrong + (kind === 'wrong' ? 1 : 0),
    skipped: state.skipped + (kind === 'skipped' ? 1 : 0),
    feedback,
  };
  const entry: RunEntry = { word, typed, kind, expected, accentsMissed };
  return { ...next, log: [...state.log, entry] };
}

export function runReducer(state: RunState, action: RunAction): RunState {
  if (state.phase === 'done') return state;

  switch (action.type) {
    case 'answer': {
      if (state.feedback || state.paused) return state;
      const typed = action.input.trim();
      if (!typed) return state;
      const j = judgeAnswer(typed, state.current.answers);
      return settle(state, j.verdict, typed, j.expected, j.accentsMissed);
    }
    case 'skip': {
      if (state.feedback || state.paused) return state;
      return settle(state, 'skipped', '', state.current.answers[0], false);
    }
    case 'advance': {
      const fb = state.feedback;
      if (!fb) return state;
      if (state.hearts <= 0) return finish(state, 'hearts');
      if (state.timeLeft <= 0) return finish(state, 'time');

      let deck = state.deck;
      if (state.mode === 'drill') {
        // A drill clears a word only by getting it right; anything else goes round again.
        if (fb.kind !== 'correct') deck = { ...deck, buckets: [[...deck.buckets[0], fb.word]] };
        if (deck.buckets[0].length === 0) return finish(state, 'cleared');
      }
      const next = draw(deck, state.mode, levelFor(state.correct));
      if (!next.word) return finish(state, 'cleared');
      return { ...state, feedback: null, current: next.word, deck: next.deck };
    }
    case 'tick': {
      // The clock stands still while a correction is on screen or the run is paused.
      if (state.paused || state.feedback) return state;
      const timeLeft = state.timeLeft - 1;
      return timeLeft <= 0 ? finish({ ...state, timeLeft: 0 }, 'time') : { ...state, timeLeft };
    }
    case 'pause':
      return state.paused ? state : { ...state, paused: true };
    case 'resume':
      return state.paused ? { ...state, paused: false } : state;
    case 'quit':
      return finish(state, 'quit');
  }
}

export interface RunSummary {
  mode: RunMode;
  endReason: EndReason;
  score: number;
  correct: number;
  almost: number;
  wrong: number;
  skipped: number;
  /** Everything answered or skipped. */
  total: number;
  accuracy: number;
  maxStreak: number;
  rank: LetterGrade;
  log: RunEntry[];
}

export function summarise(state: RunState): RunSummary {
  const total = state.correct + state.almost + state.wrong + state.skipped;
  const graded = gradeFromStats(
    { score: state.score, correctAnswers: state.correct, totalAnswered: total, maxStreak: state.maxStreak, accuracy: 0 },
    RUBRICS.rapidFire,
    'rapidFire',
  );
  return {
    mode: state.mode,
    endReason: state.endReason ?? 'quit',
    score: state.score,
    correct: state.correct,
    almost: state.almost,
    wrong: state.wrong,
    skipped: state.skipped,
    total,
    accuracy: graded.accuracy,
    maxStreak: state.maxStreak,
    rank: graded.grade,
    log: state.log,
  };
}

/** Words to drill: each one missed, skipped or near-missed, once. */
export function missedWords(log: RunEntry[]): RapidFireWord[] {
  const seen = new Set<string>();
  const out: RapidFireWord[] = [];
  for (const e of log) {
    if (e.kind === 'correct' || seen.has(e.word.id)) continue;
    seen.add(e.word.id);
    out.push(e.word);
  }
  return out;
}
