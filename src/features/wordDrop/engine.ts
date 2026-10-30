import { hintFor, isClose, isExact, isStillTyping, lowestWhere, normalizeAnswer, typedLanguage } from './matching';
import type { Direction, Pace, PlayWord } from './types';

/**
 * Word Drop's rules as pure functions over one plain state object. The screen
 * owns the clock (one animation frame → one `tick`) and the randomness, so the
 * whole game can be replayed deterministically in a test.
 *
 * Nothing here knows about XP, sessions, mastery or storage: Word Drop is a
 * game for its own sake and writes none of them. The score below is the game's
 * own and is only ever compared with the learner's previous best.
 */

export const MAX_LIVES = 3;
/** Cleared words per wave. */
export const WAVE_SIZE = 8;
/** Clears in a row that earn a life back (while one is missing). */
export const HEAL_EVERY = 10;
/** A missed word comes back after this many other spawns. */
export const RETRY_AFTER_SPAWNS = 5;
/** Where a card sits when it spawns and where it counts as landed (% of the field). */
export const SPAWN_Y = -6;
export const FLOOR_Y = 84;
/** A hint (first letter and length) appears once a card has fallen this far. */
export const HINT_Y = 52;

const GHOST_MS = 700;
const MISS_NOTE_MS = 2600;
const FIRST_SPAWN_MS = 700;
const MAX_TICK_MS = 100;

const FALL_SECONDS: Record<Pace, number> = { relaxed: 16, steady: 12, quick: 8.5 };
const SPAWN_MS: Record<Pace, number> = { relaxed: 3300, steady: 2700, quick: 2100 };

export type Phase = 'playing' | 'paused' | 'over';

export interface FallingWord {
  uid: number;
  word: PlayWord;
  lane: number;
  /** Centre of the card, % of the field's height. */
  y: number;
  /** A word that was missed earlier and has come back. */
  again: boolean;
}

/** A cleared word lingering where it was caught, showing its answer. */
export interface Ghost {
  uid: number;
  lane: number;
  y: number;
  text: string;
  ageMs: number;
}

/** The last missed word, shown on the floor with its answer. */
export interface MissNote {
  uid: number;
  text: string;
  answer: string;
  ageMs: number;
}

export type GameEvent =
  | { seq: number; kind: 'clear'; points: number; multiplier: number; close: boolean }
  | { seq: number; kind: 'miss' }
  | { seq: number; kind: 'wave'; wave: number }
  | { seq: number; kind: 'heal' }
  | { seq: number; kind: 'over' };

export interface GameSettings {
  direction: Direction;
  pace: Pace;
  /** How many columns the field has (narrow screens use fewer). */
  lanes: number;
}

export interface GameState {
  phase: Phase;
  settings: GameSettings;
  words: FallingWord[];
  ghosts: Ghost[];
  miss: MissNote | null;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  cleared: number;
  missed: number;
  wave: number;
  clearedInWave: number;
  elapsedMs: number;
  spawnInMs: number;
  spawnsSinceStart: number;
  nextUid: number;
  /** Missed words waiting to come back; `after` counts spawns left. */
  retry: { word: PlayWord; after: number }[];
  /** Ids already dropped this round, so a bag is emptied before any word repeats. */
  used: string[];
  /** Words missed and not yet caught on their second go, in the order missed. */
  review: PlayWord[];
  event: GameEvent | null;
}

export interface Env {
  pool: readonly PlayWord[];
  rng: () => number;
}

export function createGame(settings: GameSettings): GameState {
  return {
    phase: 'playing',
    settings,
    words: [],
    ghosts: [],
    miss: null,
    lives: MAX_LIVES,
    score: 0,
    combo: 0,
    bestCombo: 0,
    cleared: 0,
    missed: 0,
    wave: 1,
    clearedInWave: 0,
    elapsedMs: 0,
    spawnInMs: FIRST_SPAWN_MS,
    spawnsSinceStart: 0,
    nextUid: 1,
    retry: [],
    used: [],
    review: [],
    event: null,
  };
}

// ── difficulty curve ──────────────────────────────────────────────────────────

/** % of the field a card falls per second. */
export function fallSpeed(wave: number, pace: Pace): number {
  const seconds = Math.max(FALL_SECONDS[pace] * 0.45, FALL_SECONDS[pace] * Math.pow(0.93, wave - 1));
  return (FLOOR_Y - SPAWN_Y) / seconds;
}

export function spawnGapMs(wave: number, pace: Pace): number {
  return Math.max(SPAWN_MS[pace] * 0.42, SPAWN_MS[pace] - (wave - 1) * 150);
}

export function maxOnField(wave: number, lanes: number): number {
  return Math.min(lanes, 6, 2 + Math.ceil(wave / 2));
}

/**
 * Whether a card's text suits the field at this point: early waves stay short,
 * and a narrow field (three columns) never gets a word wider than its column.
 */
export function fitsField(text: string, wave: number, lanes: number): boolean {
  const byWave = wave <= 2 ? 9 : wave <= 4 ? 12 : wave <= 7 ? 15 : 22;
  if (text.length > byWave) return false;
  if (lanes <= 3) return Math.max(...text.split(' ').map(t => t.length)) <= 10;
  return true;
}

export function multiplierFor(combo: number): number {
  return 1 + Math.min(3, Math.floor(combo / 5));
}

// ── spawning ──────────────────────────────────────────────────────────────────

function pickFresh(state: GameState, env: Env): { word: PlayWord; used: string[] } | null {
  const onField = new Set(state.words.map(w => w.word.id));
  const queued = new Set(state.retry.map(r => r.word.id));
  const eligible = (w: PlayWord) => !onField.has(w.id) && !queued.has(w.id);

  const fits = env.pool.filter(w => fitsField(w.text, state.wave, state.settings.lanes) && eligible(w));
  const source = fits.length > 0 ? fits : env.pool.filter(eligible);
  if (source.length === 0) return null;

  const used = new Set(state.used);
  let bag = source.filter(w => !used.has(w.id));
  let nextUsed = state.used;
  if (bag.length === 0) {
    bag = source;
    nextUsed = [];
  }
  const word = bag[Math.floor(env.rng() * bag.length)];
  return { word, used: [...nextUsed, word.id] };
}

function freeLane(state: GameState, env: Env): number {
  const { lanes } = state.settings;
  const busy = new Set(state.words.filter(w => w.y < 26).map(w => w.lane));
  const free = Array.from({ length: lanes }, (_, i) => i).filter(i => !busy.has(i));
  const choices = free.length > 0 ? free : Array.from({ length: lanes }, (_, i) => i);
  return choices[Math.floor(env.rng() * choices.length)];
}

function spawn(state: GameState, env: Env): GameState {
  // A missed word whose wait is over takes this spawn.
  const due = state.retry.find(r => r.after <= 0);
  const waiting = state.retry
    .filter(r => r !== due)
    .map(r => ({ ...r, after: r.after - 1 }));

  let word: PlayWord | null = due?.word ?? null;
  let used = state.used;
  if (!word) {
    const fresh = pickFresh({ ...state, retry: waiting }, env);
    if (!fresh) return { ...state, retry: waiting, spawnInMs: 600 };
    word = fresh.word;
    used = fresh.used;
  }

  const lane = freeLane(state, env);
  const card: FallingWord = { uid: state.nextUid, word, lane, y: SPAWN_Y, again: Boolean(due) };
  const { wave, settings } = state;
  const jitter = 0.85 + env.rng() * 0.3;
  return {
    ...state,
    words: [...state.words, card],
    retry: waiting,
    used,
    nextUid: state.nextUid + 1,
    spawnsSinceStart: state.spawnsSinceStart + 1,
    spawnInMs: spawnGapMs(wave, settings.pace) * jitter,
  };
}

// ── time ──────────────────────────────────────────────────────────────────────

function withEvent(state: GameState, make: (seq: number) => GameEvent): GameState {
  return { ...state, event: make((state.event?.seq ?? 0) + 1) };
}

function land(state: GameState, card: FallingWord): GameState {
  const missedBefore = state.review.some(w => w.id === card.word.id);
  const lives = state.lives - 1;
  let next: GameState = {
    ...state,
    words: state.words.filter(w => w !== card),
    lives,
    missed: state.missed + 1,
    combo: 0,
    miss: { uid: card.uid, text: card.word.text, answer: card.word.answer, ageMs: 0 },
    review: missedBefore ? state.review : [...state.review, card.word],
    // A word gets one second go; missing it again just stays in the review.
    retry: card.again || missedBefore
      ? state.retry
      : [...state.retry, { word: card.word, after: RETRY_AFTER_SPAWNS }],
  };
  next = withEvent(next, seq => ({ seq, kind: 'miss' }));
  if (lives <= 0) {
    next = withEvent({ ...next, phase: 'over', words: [] }, seq => ({ seq, kind: 'over' }));
  }
  return next;
}

/** Advance the game by `dtMs`. Does nothing unless the game is playing. */
export function tick(state: GameState, dtMs: number, env: Env): GameState {
  if (state.phase !== 'playing') return state;
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  const fall = (fallSpeed(state.wave, state.settings.pace) * dt) / 1000;

  let next: GameState = {
    ...state,
    elapsedMs: state.elapsedMs + dt,
    words: state.words.map(w => ({ ...w, y: w.y + fall })),
    ghosts: state.ghosts
      .map(g => ({ ...g, ageMs: g.ageMs + dt }))
      .filter(g => g.ageMs < GHOST_MS),
    miss: state.miss && state.miss.ageMs + dt < MISS_NOTE_MS ? { ...state.miss, ageMs: state.miss.ageMs + dt } : null,
    spawnInMs: state.spawnInMs - dt,
  };

  // Words landing, lowest first so a lost last life ends the round on the first one.
  const landed = next.words.filter(w => w.y >= FLOOR_Y).sort((a, b) => b.y - a.y);
  for (const card of landed) {
    if (next.phase !== 'playing') break;
    next = land(next, card);
  }
  if (next.phase !== 'playing') return next;

  if (next.words.length === 0 && next.spawnInMs > 350) next = { ...next, spawnInMs: 350 };
  if (next.spawnInMs <= 0 && next.words.length < maxOnField(next.wave, next.settings.lanes)) {
    next = spawn(next, env);
  } else if (next.spawnInMs <= 0) {
    next = { ...next, spawnInMs: 250 };
  }
  return next;
}

// ── answers ───────────────────────────────────────────────────────────────────

export type SubmitResult = 'cleared' | 'wrong' | 'waiting' | 'ignored';

function clear(state: GameState, card: FallingWord, close: boolean): GameState {
  const combo = state.combo + 1;
  const multiplier = multiplierFor(combo);
  // Catching a word high up is worth more than one scraping the floor.
  const speedBonus = Math.round((1 - Math.max(0, card.y) / FLOOR_Y) * 6);
  const points = (10 + speedBonus) * multiplier;

  let next: GameState = {
    ...state,
    words: state.words.filter(w => w !== card),
    ghosts: [...state.ghosts, { uid: card.uid, lane: card.lane, y: card.y, text: card.word.answer, ageMs: 0 }],
    score: state.score + points,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    cleared: state.cleared + 1,
    clearedInWave: state.clearedInWave + 1,
    review: card.again ? state.review.filter(w => w.id !== card.word.id) : state.review,
  };
  next = withEvent(next, seq => ({ seq, kind: 'clear', points, multiplier, close }));

  if (combo % HEAL_EVERY === 0 && next.lives < MAX_LIVES) {
    next = withEvent({ ...next, lives: next.lives + 1 }, seq => ({ seq, kind: 'heal' }));
  }
  if (next.clearedInWave >= WAVE_SIZE) {
    const wave = next.wave + 1;
    next = withEvent({ ...next, wave, clearedInWave: 0 }, seq => ({ seq, kind: 'wave', wave }));
  }
  return next;
}

/**
 * Check what the learner has typed against the field.
 *
 * `live` runs on every keystroke: an exact answer clears the lowest matching
 * word at once, unless the text could still grow into a longer answer.
 * `enter` runs when they press Enter: an exact answer clears, and so does one
 * that is a typo or two away (never for short words).
 */
export function submit(
  state: GameState,
  typedRaw: string,
  mode: 'live' | 'enter',
): { state: GameState; result: SubmitResult } {
  if (state.phase !== 'playing') return { state, result: 'ignored' };
  const typed = normalizeAnswer(typedRaw, typedLanguage(state.settings.direction));
  if (typed.length === 0) return { state, result: 'ignored' };

  const accepting = state.words.map(w => ({ ...w, accept: w.word.accept }));
  const exact = lowestWhere(accepting, w => isExact(w, typed));
  if (exact) {
    if (mode === 'live' && isStillTyping(accepting, typed)) return { state, result: 'waiting' };
    const card = state.words.find(w => w.uid === exact.uid)!;
    return { state: clear(state, card, false), result: 'cleared' };
  }
  if (mode === 'enter') {
    const close = lowestWhere(accepting, w => isClose(w, typed));
    if (close) {
      const card = state.words.find(w => w.uid === close.uid)!;
      return { state: clear(state, card, true), result: 'cleared' };
    }
    return { state, result: 'wrong' };
  }
  return { state, result: 'ignored' };
}

export function pause(state: GameState): GameState {
  return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;
}

export function resume(state: GameState): GameState {
  return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
}

/** Ends the round early; the score so far stands. */
export function endGame(state: GameState): GameState {
  if (state.phase === 'over') return state;
  return withEvent({ ...state, phase: 'over', words: [] }, seq => ({ seq, kind: 'over' }));
}

// ── read-outs ─────────────────────────────────────────────────────────────────

export function accuracy(state: Pick<GameState, 'cleared' | 'missed'>): number {
  const total = state.cleared + state.missed;
  return total === 0 ? 0 : Math.round((state.cleared / total) * 100);
}

/** The hint for a card that has fallen far enough, else null. */
export function hintText(card: FallingWord): string | null {
  return card.y >= HINT_Y ? hintFor(card.word.accept[0]) : null;
}
