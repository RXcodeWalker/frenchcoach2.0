import type { RebuildQuestion } from '../../types';
import type { Level, Setup } from './types';

/**
 * Sentence Rebuilder rules, as pure functions over an immutable `GameState`.
 * Nothing here touches React, storage or the clock: the hook steps `tick`, the
 * screen calls the moves, and every random choice takes an injected `rng` so a
 * test can replay a round exactly.
 *
 * This is a game for its own sake. Points are a game score — they are not XP,
 * and no function here knows what XP is (`rebuilder.isolation.test.ts`).
 */

// ── tunables ──────────────────────────────────────────────────────────────────
/** Sentences in a Classic or Tricky round (a missed one comes back once, on top). */
export const ROUND_LENGTH = 8;
/** Checks allowed per sentence before the answer is shown (Speed has no cap). */
export const MAX_ATTEMPTS = 3;
export const SPEED_START_MS = 60_000;
export const SPEED_CAP_MS = 90_000;
/** A first-try, no-hint solve buys this much time in Speed; any other solve buys the smaller one. */
export const CLEAN_BONUS_MS = 6_000;
export const SOLVE_BONUS_MS = 3_000;
/** A wrong check or a skip costs this much time in Speed. */
export const MISS_PENALTY_MS = 3_000;
/** Clean solves, in different rounds, before a sentence counts as mastered. */
export const MASTERED_AT = 2;

const BASE_POINTS = { 1: 100, 2: 150, 3: 200 } as const;
const MIXED_QUOTA = { 1: 3, 2: 3, 3: 2 } as const;

// ── words ─────────────────────────────────────────────────────────────────────
/** Compares words ignoring case and trailing punctuation ("Hier," = "hier"), never accents. */
export const tokenKey = (word: string): string => word.toLowerCase().replace(/[,.;!]+$/u, '');

/**
 * How a word reads on its tile. A tile never carries the clue that made the
 * sentence easy: the capital letter that opens it, or the comma that closes a
 * clause. (The answer panel shows the sentence properly written.)
 */
export const tileText = (word: string, opensSentence = false): string => {
  const bare = word.replace(/[,.;!]+$/u, '');
  return opensSentence ? bare.charAt(0).toLowerCase() + bare.slice(1) : bare;
};

/** The words of an alternative order, which is written as a plain sentence. */
export const sentenceWords = (sentence: string): string[] => sentence.trim().split(/\s+/u).filter(Boolean);

/** Every accepted word order for a sentence, as comparison keys: the main one first. */
export function acceptedOrders(q: RebuildQuestion): string[][] {
  return [q.fragments.map(tokenKey), ...(q.alternatives ?? []).map(a => sentenceWords(a).map(tokenKey))];
}

/** Words the learner must place — decoys are never part of the count. */
export const requiredLength = (q: RebuildQuestion): number => q.fragments.length;

export type Mark = 'right' | 'wrong';

/** Marks each placed word against the accepted order it agrees with most. */
export function gradeAttempt(words: readonly string[], q: RebuildQuestion): { correct: boolean; marks: Mark[] } {
  const keys = words.map(tokenKey);
  let best: Mark[] = keys.map(() => 'wrong');
  let bestRight = -1;
  for (const order of acceptedOrders(q)) {
    const marks: Mark[] = keys.map((k, i) => (k === order[i] ? 'right' : 'wrong'));
    const right = marks.filter(m => m === 'right').length;
    if (right === order.length && keys.length === order.length) return { correct: true, marks };
    if (right > bestRight) {
      best = marks;
      bestRight = right;
    }
  }
  return { correct: false, marks: best };
}

// ── scoring ───────────────────────────────────────────────────────────────────
/** ×1 to start, ×1.5 after three clean solves in a row, ×2 after six. */
export const comboMultiplier = (combo: number): number => (combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1);

/**
 * Points for one solved sentence. `attempts` counts the check that solved it
 * (so a first-try solve is 1); `combo` is the clean streak before this sentence.
 * The multiplier applies only to a clean solve.
 */
export function pointsFor(difficulty: 1 | 2 | 3, attempts: number, hints: number, combo: number): number {
  const attemptFactor = attempts <= 1 ? 1 : attempts === 2 ? 0.6 : 0.3;
  const hintFactor = Math.max(0.2, 1 - 0.2 * hints);
  const clean = attempts <= 1 && hints === 0;
  const raw = BASE_POINTS[difficulty] * attemptFactor * hintFactor * (clean ? comboMultiplier(combo) : 1);
  return Math.max(10, Math.round(raw));
}

// ── state ─────────────────────────────────────────────────────────────────────
export interface Tile {
  id: string;
  text: string;
  /** A wrong word added by Tricky mode. Never shown differently — only the engine knows. */
  decoy: boolean;
}

export type Outcome = 'clean' | 'solved' | 'revealed' | 'skipped';

export interface SentenceState {
  question: RebuildQuestion;
  /** The bank, shuffled once. Placing a word never reorders it, so the bank doesn't jump. */
  tiles: Tile[];
  /** Ids of the tiles on the line, in order. */
  built: string[];
  /** Checks made so far. */
  attempts: number;
  hints: number;
  /** After a wrong check: which placed words are in the right place. Cleared by any change to the line. */
  marks: Mark[] | null;
  /** The words of the last wrong check, kept for the reveal. */
  lastWrong: string[] | null;
  outcome: Outcome | null;
  points: number;
  /** A sentence that came back after being missed. */
  repeat: boolean;
}

export interface Result {
  id: string;
  outcome: Outcome;
  attempts: number;
  hints: number;
  points: number;
  repeat: boolean;
}

export type Phase = 'building' | 'feedback' | 'paused' | 'over';

export interface GameState {
  setup: Setup;
  /** A drill replays the sentences just missed: it records no best. */
  drill: boolean;
  queue: Array<{ question: RebuildQuestion; repeat: boolean }>;
  current: SentenceState;
  done: Result[];
  /** Sentences planned, repeats included. 0 in Speed, which has no length. */
  total: number;
  score: number;
  combo: number;
  bestCombo: number;
  /** Milliseconds left in Speed; null elsewhere. */
  timeMs: number | null;
  phase: Phase;
  /** Why the round ended, once it has. */
  endedBy: 'finished' | 'clock' | 'left' | null;
}

export type Rng = () => number;

// ── selection ─────────────────────────────────────────────────────────────────
export function levelDifficulty(level: Level): 1 | 2 | 3 | null {
  return level === 'starter' ? 1 : level === 'standard' ? 2 : level === 'stretch' ? 3 : null;
}

export function poolFor(level: Level, bank: readonly RebuildQuestion[]): RebuildQuestion[] {
  const d = levelDifficulty(level);
  return d === null ? [...bank] : bank.filter(q => q.difficulty === d);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The sentences for a round. Ones the learner hasn't mastered come first, then
 * the rest. Mixed Classic/Tricky takes a spread (3 easy, 3 middle, 2 hard) and
 * plays them easiest first; Speed takes the whole pool and lets the clock decide.
 * `only` restricts to those ids (a drill of missed sentences).
 */
export function pickQuestions(
  bank: readonly RebuildQuestion[],
  setup: Setup,
  mastery: Readonly<Record<string, number>>,
  rng: Rng,
  only?: readonly string[],
): RebuildQuestion[] {
  const pool = only ? bank.filter(q => only.includes(q.id)) : poolFor(setup.level, bank);
  const fresh = shuffle(pool.filter(q => (mastery[q.id] ?? 0) < MASTERED_AT), rng);
  const known = shuffle(pool.filter(q => (mastery[q.id] ?? 0) >= MASTERED_AT), rng);
  const ordered = [...fresh, ...known];
  if (only || setup.mode === 'speed') return ordered;

  if (setup.level !== 'mixed') return ordered.slice(0, ROUND_LENGTH);

  const chosen: RebuildQuestion[] = [];
  for (const d of [1, 2, 3] as const) {
    chosen.push(...ordered.filter(q => q.difficulty === d).slice(0, MIXED_QUOTA[d]));
  }
  for (const q of ordered) {
    if (chosen.length >= ROUND_LENGTH) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen.sort((a, b) => a.difficulty - b.difficulty);
}

// ── building a sentence ───────────────────────────────────────────────────────
function startSentence(question: RebuildQuestion, repeat: boolean, setup: Setup, rng: Rng): SentenceState {
  const real: Tile[] = question.fragments.map((text, i) => ({ id: `${question.id}:${i}`, text: tileText(text, i === 0), decoy: false }));
  // Decoys are common words, so they lose their capital too — otherwise a capital would give them away.
  const decoys: Tile[] =
    setup.mode === 'tricky'
      ? (question.distractors ?? []).map((text, i) => ({ id: `${question.id}:d${i}`, text: tileText(text, true), decoy: true }))
      : [];
  const all = [...real, ...decoys];

  // Never hand over the sentence already in order.
  const inOrder = (tiles: Tile[]) => {
    const seen = tiles.filter(t => !t.decoy).map(t => t.id);
    return seen.every((id, i) => id === real[i].id);
  };
  let tiles = shuffle(all, rng);
  for (let tries = 0; tries < 12 && real.length > 1 && inOrder(tiles); tries++) tiles = shuffle(all, rng);

  return { question, tiles, built: [], attempts: 0, hints: 0, marks: null, lastWrong: null, outcome: null, points: 0, repeat };
}

export function createGame(setup: Setup, questions: readonly RebuildQuestion[], rng: Rng, opts: { drill?: boolean } = {}): GameState {
  const [first, ...rest] = questions;
  const speed = setup.mode === 'speed';
  if (!first) {
    throw new Error('createGame needs at least one sentence');
  }
  return {
    setup,
    drill: opts.drill ?? false,
    queue: rest.map(question => ({ question, repeat: false })),
    current: startSentence(first, false, setup, rng),
    done: [],
    total: speed ? 0 : questions.length,
    score: 0,
    combo: 0,
    bestCombo: 0,
    timeMs: speed ? SPEED_START_MS : null,
    phase: 'building',
    endedBy: null,
  };
}

const tileById = (s: SentenceState, id: string): Tile | undefined => s.tiles.find(t => t.id === id);
export const builtWords = (s: SentenceState): string[] => s.built.map(id => tileById(s, id)?.text ?? '');
export const isFull = (s: SentenceState): boolean => s.built.length >= requiredLength(s.question);

// ── moves on the line ─────────────────────────────────────────────────────────
const building = (g: GameState): boolean => g.phase === 'building';
const withCurrent = (g: GameState, patch: Partial<SentenceState>): GameState => ({ ...g, current: { ...g.current, ...patch } });

export function place(g: GameState, tileId: string): GameState {
  const s = g.current;
  if (!building(g) || isFull(s) || s.built.includes(tileId) || !tileById(s, tileId)) return g;
  return withCurrent(g, { built: [...s.built, tileId], marks: null });
}

export function remove(g: GameState, tileId: string): GameState {
  const s = g.current;
  if (!building(g) || !s.built.includes(tileId)) return g;
  return withCurrent(g, { built: s.built.filter(id => id !== tileId), marks: null });
}

export function undo(g: GameState): GameState {
  const last = g.current.built[g.current.built.length - 1];
  return last ? remove(g, last) : g;
}

export function clear(g: GameState): GameState {
  if (!building(g) || g.current.built.length === 0) return g;
  return withCurrent(g, { built: [], marks: null });
}

/**
 * A hint keeps the words already in the right place, sends everything after the
 * first slip back to the bank, and sets down the next right word. It costs
 * points (see `pointsFor`), never time.
 */
export function hint(g: GameState): GameState {
  if (!building(g)) return g;
  const s = g.current;
  const keys = builtWords(s).map(tokenKey);

  let order: string[] = acceptedOrders(s.question)[0];
  let prefix = -1;
  for (const candidate of acceptedOrders(s.question)) {
    let n = 0;
    while (n < keys.length && n < candidate.length && keys[n] === candidate[n]) n++;
    if (n > prefix) {
      prefix = n;
      order = candidate;
    }
  }
  if (prefix >= order.length) return g;

  const kept = s.built.slice(0, prefix);
  const tile = s.tiles.find(t => !kept.includes(t.id) && tokenKey(t.text) === order[prefix]);
  if (!tile) return g;
  return withCurrent(g, { built: [...kept, tile.id], hints: s.hints + 1, marks: null });
}

// ── checking, revealing, moving on ────────────────────────────────────────────
function applyTime(g: GameState, deltaMs: number): GameState {
  if (g.timeMs === null) return g;
  const timeMs = Math.min(SPEED_CAP_MS, g.timeMs + deltaMs);
  return timeMs <= 0 ? { ...g, timeMs: 0, phase: 'over', endedBy: 'clock' } : { ...g, timeMs };
}

/** Shows the answer: the line becomes the sentence, and the sentence is a miss. */
function reveal(g: GameState, outcome: 'revealed' | 'skipped', lastWrong: string[] | null): GameState {
  const s = g.current;
  const order = acceptedOrders(s.question)[0];
  const used = new Set<string>();
  const built = order.map(key => {
    const tile = s.tiles.find(t => !used.has(t.id) && tokenKey(t.text) === key);
    if (tile) used.add(tile.id);
    return tile?.id ?? '';
  });
  return {
    ...g,
    combo: 0,
    phase: 'feedback',
    current: { ...s, built, marks: null, lastWrong, outcome, points: 0 },
  };
}

export function check(g: GameState): GameState {
  const s = g.current;
  // A line that hasn't changed since a miss can't be checked again: no burning tries by double-tap.
  if (!building(g) || !isFull(s) || s.marks !== null) return g;

  const { correct, marks } = gradeAttempt(builtWords(s), s.question);
  const attempts = s.attempts + 1;
  const speed = g.setup.mode === 'speed';

  if (correct) {
    const clean = attempts === 1 && s.hints === 0;
    const points = pointsFor(s.question.difficulty, attempts, s.hints, g.combo);
    const combo = clean ? g.combo + 1 : 0;
    const solved: GameState = {
      ...g,
      score: g.score + points,
      combo,
      bestCombo: Math.max(g.bestCombo, combo),
      phase: 'feedback',
      current: { ...s, attempts, marks: null, lastWrong: null, outcome: clean ? 'clean' : 'solved', points },
    };
    return speed ? applyTime(solved, clean ? CLEAN_BONUS_MS : SOLVE_BONUS_MS) : solved;
  }

  const missed = applyTime({ ...g, combo: 0, current: { ...s, attempts, marks } }, speed ? -MISS_PENALTY_MS : 0);
  if (missed.phase === 'over') return missed;
  if (!speed && attempts >= MAX_ATTEMPTS) return reveal(missed, 'revealed', builtWords(s));
  return missed;
}

/** Gives up on this sentence: the answer is shown and the sentence comes back later. */
export function skip(g: GameState): GameState {
  if (!building(g)) return g;
  const speed = g.setup.mode === 'speed';
  const revealed = reveal(g, 'skipped', null);
  return speed ? applyTime(revealed, -MISS_PENALTY_MS) : revealed;
}

/** From the feedback panel to the next sentence — or to the end. */
export function next(g: GameState, rng: Rng): GameState {
  if (g.phase !== 'feedback' || !g.current.outcome) return g;
  const s = g.current;
  const result: Result = { id: s.question.id, outcome: s.outcome as Outcome, attempts: s.attempts, hints: s.hints, points: s.points, repeat: s.repeat };
  const done = [...g.done, result];

  const missed = s.outcome === 'revealed' || s.outcome === 'skipped';
  const comesBack = missed && !s.repeat && g.setup.mode !== 'speed';
  const queue = comesBack ? [...g.queue, { question: s.question, repeat: true }] : g.queue;
  const total = comesBack ? g.total + 1 : g.total;

  const [upcoming, ...rest] = queue;
  if (!upcoming) return { ...g, done, queue: [], total, phase: 'over', endedBy: 'finished' };
  return {
    ...g,
    done,
    queue: rest,
    total,
    phase: 'building',
    current: startSentence(upcoming.question, upcoming.repeat, g.setup, rng),
  };
}

// ── the clock (Speed) ─────────────────────────────────────────────────────────
/** Runs only while a sentence is being built: reading the feedback never costs time. */
export function tick(g: GameState, dtMs: number): GameState {
  if (g.timeMs === null || g.phase !== 'building') return g;
  return applyTime(g, -dtMs);
}

export function pause(g: GameState): GameState {
  return g.setup.mode === 'speed' && g.phase === 'building' ? { ...g, phase: 'paused' } : g;
}

export function resume(g: GameState): GameState {
  return g.phase === 'paused' ? { ...g, phase: 'building' } : g;
}

export function leave(g: GameState): GameState {
  return g.phase === 'over' ? g : { ...g, phase: 'over', endedBy: 'left' };
}

// ── what happened ─────────────────────────────────────────────────────────────
const isSolved = (o: Outcome) => o === 'clean' || o === 'solved';

export interface Summary {
  /** Sentences put right (a repeat counts too). */
  solved: number;
  /** Solved on the first check with no hint, the first time round. */
  clean: number;
  hints: number;
  /** Sentences still missed when the round ended, in the order they were met. */
  missedIds: string[];
  /** Sentences whose first run was a clean solve: the ones that count towards mastery. */
  masteredIds: string[];
  /** Percent of first-time sentences solved cleanly. */
  accuracy: number;
}

export function summarise(g: GameState): Summary {
  const last = new Map<string, Outcome>();
  for (const r of g.done) last.set(r.id, r.outcome);
  const firstRuns = g.done.filter(r => !r.repeat);
  const clean = firstRuns.filter(r => r.outcome === 'clean');
  return {
    solved: g.done.filter(r => isSolved(r.outcome)).length,
    clean: clean.length,
    hints: g.done.reduce((n, r) => n + r.hints, 0),
    missedIds: [...last].filter(([, o]) => !isSolved(o)).map(([id]) => id),
    masteredIds: clean.map(r => r.id),
    accuracy: firstRuns.length === 0 ? 0 : Math.round((clean.length / firstRuns.length) * 100),
  };
}

/** The sentence the learner is building, as text — what the line says right now. */
export const lineText = (s: SentenceState): string => builtWords(s).join(' ');
