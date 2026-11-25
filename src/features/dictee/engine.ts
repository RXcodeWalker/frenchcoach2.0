import { acceptedSpellings, itemsFor, type DicteeFormat, type DicteeItem, type DicteeLevel } from '../../data/dictee';
import { judgeLine, type Verdict } from './judge';

/**
 * Dictée's rules: pure, seeded, no clock and no `Math.random`. The screen owns
 * what is heard (the voice) and what is typed; this owns what it is worth.
 *
 * A round is ten words or six sentences. Each answer is worth up to 100 points
 * (by the share of words right; a missing accent or apostrophe is half a
 * word). A perfect answer that took no more than a couple of listens and no
 * look at the meaning earns a 25-point "sharp ear" bonus, and perfect answers
 * in a row add a growing streak bonus. Nothing here touches XP.
 */

export type Focus = 'any' | 'sound-alikes' | 'slips';

export interface Setup {
  format: DicteeFormat;
  level: DicteeLevel;
  focus: Focus;
}

export const ROUND_SIZE: Record<DicteeFormat, number> = { words: 10, sentences: 6 };
/** A perfect answer needs no more listens than this for the sharp-ear bonus. */
export const EAR_PLAYS: Record<DicteeFormat, number> = { words: 2, sentences: 3 };
export const BASE_POINTS = 100;
export const EAR_BONUS = 25;
export const STREAK_BONUS_STEP = 10;
export const STREAK_BONUS_CAP = 50;
/** "My slips" needs at least this many lines to make a round. */
export const MIN_SLIPS_ROUND = 3;

export type Phase = 'answering' | 'feedback' | 'over';

export interface Attempt {
  item: DicteeItem;
  typed: string;
  verdict: Verdict;
  /** The learner gave up or couldn't hear it. */
  skipped: boolean;
  plays: number;
  usedMeaning: boolean;
  /** A perfect answer that earned the sharp-ear bonus. */
  ear: boolean;
  /** Perfect answers in a row, this one included (0 after a miss). */
  streak: number;
  points: number;
}

export interface GameState {
  setup: Setup;
  items: DicteeItem[];
  index: number;
  phase: Phase;
  attempts: Attempt[];
  score: number;
  streak: number;
  bestStreak: number;
  /** Listens to the current line (the first, automatic one included). */
  plays: number;
  /** The meaning was shown for the current line. */
  usedMeaning: boolean;
}

// ── choosing a round ────────────────────────────────────────────────────────

/** mulberry32: a small seeded generator, so a round can be replayed in a test. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Every line a setup can draw from. */
export function poolFor(setup: Setup, slipIds: ReadonlySet<string>, all: (f: DicteeFormat, l: DicteeLevel) => DicteeItem[] = itemsFor): DicteeItem[] {
  if (setup.focus === 'slips') {
    return (['A1', 'A2', 'B1'] as const).flatMap(l => all(setup.format, l)).filter(i => slipIds.has(i.id));
  }
  const pool = all(setup.format, setup.level);
  return setup.focus === 'sound-alikes' ? pool.filter(i => (i.traps?.length ?? 0) > 0) : pool;
}

/**
 * A remembered setup that can no longer be played — "My slips" after the list
 * has emptied — falls back to Anything, so the learner never lands on a Start
 * button that does nothing.
 */
export function settleSetup(setup: Setup, slipIds: ReadonlySet<string>): Setup {
  return setup.focus === 'slips' && poolFor(setup, slipIds).length < MIN_SLIPS_ROUND ? { ...setup, focus: 'any' } : setup;
}

/** Whether a setup has enough lines to make a round. */
export function canPlay(setup: Setup, pool: readonly DicteeItem[]): boolean {
  return pool.length >= (setup.focus === 'slips' ? MIN_SLIPS_ROUND : ROUND_SIZE[setup.format]);
}

/**
 * A round: lines the learner hasn't had lately first (`avoid` is soft — it
 * only fills the round if the pool is too small without them), then ordered
 * short to long, so a round warms up.
 */
export function pickRound(pool: readonly DicteeItem[], format: DicteeFormat, random: () => number, avoid: ReadonlySet<string> = new Set()): DicteeItem[] {
  const size = Math.min(ROUND_SIZE[format], pool.length);
  const fresh = shuffled(pool.filter(i => !avoid.has(i.id)), random);
  const stale = shuffled(pool.filter(i => avoid.has(i.id)), random);
  return [...fresh, ...stale].slice(0, size).sort((a, b) => a.fr.length - b.fr.length);
}

// ── playing ─────────────────────────────────────────────────────────────────

export function createGame(setup: Setup, items: DicteeItem[]): GameState {
  return {
    setup,
    items,
    index: 0,
    phase: items.length === 0 ? 'over' : 'answering',
    attempts: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    plays: 0,
    usedMeaning: false,
  };
}

export const currentItem = (g: GameState): DicteeItem | null => g.items[g.index] ?? null;

/** One more listen to the current line. */
export function recordPlay(g: GameState): GameState {
  return g.phase === 'answering' ? { ...g, plays: g.plays + 1 } : g;
}

export function showMeaning(g: GameState): GameState {
  return g.phase === 'answering' && !g.usedMeaning ? { ...g, usedMeaning: true } : g;
}

export function streakBonus(streak: number): number {
  return streak >= 3 ? Math.min(STREAK_BONUS_CAP, STREAK_BONUS_STEP * (streak - 2)) : 0;
}

function settle(g: GameState, typed: string, skipped: boolean): GameState {
  const item = currentItem(g);
  if (!item || g.phase !== 'answering') return g;
  const verdict = judgeLine(acceptedSpellings(item), skipped ? '' : typed);
  const perfect = !skipped && verdict.perfect;
  const ear = perfect && g.plays <= EAR_PLAYS[item.format] && !g.usedMeaning;
  const streak = perfect ? g.streak + 1 : 0;
  const points = Math.round(BASE_POINTS * verdict.credit) + (ear ? EAR_BONUS : 0) + (perfect ? streakBonus(streak) : 0);
  const attempt: Attempt = { item, typed, verdict, skipped, plays: g.plays, usedMeaning: g.usedMeaning, ear, streak, points };
  return {
    ...g,
    phase: 'feedback',
    attempts: [...g.attempts, attempt],
    score: g.score + points,
    streak,
    bestStreak: Math.max(g.bestStreak, streak),
  };
}

/** Marks what was typed. Nothing typed is not an answer: use `giveUp`. */
export function submit(g: GameState, typed: string): GameState {
  return typed.trim() === '' ? g : settle(g, typed, false);
}

/** "I couldn't hear it": shows the answer, scores nothing, breaks the streak. */
export function giveUp(g: GameState): GameState {
  return settle(g, '', true);
}

/** Moves to the next line, or ends the round after the last one. */
export function next(g: GameState): GameState {
  if (g.phase !== 'feedback') return g;
  const index = g.index + 1;
  return index >= g.items.length
    ? { ...g, index, phase: 'over' }
    : { ...g, index, phase: 'answering', plays: 0, usedMeaning: false };
}

// ── the end ─────────────────────────────────────────────────────────────────

export interface RoundSummary {
  score: number;
  /** 0–1: the average credit over the round. */
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  perfect: number;
  answered: number;
  bestStreak: number;
  listens: number;
  /** Lines that were not perfect, in the order they came. */
  slips: Attempt[];
}

export function starsFor(accuracy: number): 0 | 1 | 2 | 3 {
  return accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.4 ? 1 : 0;
}

export function summarise(g: GameState): RoundSummary {
  const n = g.attempts.length;
  const accuracy = n === 0 ? 0 : g.attempts.reduce((s, a) => s + a.verdict.credit, 0) / n;
  return {
    score: g.score,
    accuracy,
    stars: starsFor(accuracy),
    perfect: g.attempts.filter(a => !a.skipped && a.verdict.perfect).length,
    answered: n,
    bestStreak: g.bestStreak,
    listens: g.attempts.reduce((s, a) => s + a.plays, 0),
    slips: g.attempts.filter(a => a.skipped || !a.verdict.perfect),
  };
}
