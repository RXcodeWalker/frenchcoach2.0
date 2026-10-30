import { banksFor, type BossQuestion } from './bank';
import { isCorrectAnswer } from './answer';
import { bossLine, type Boss } from './bosses';

/**
 * The Boss Battle rules as a pure state machine: no React, no storage, no
 * clock, no `Math.random` (a seed in the state drives every shuffle), and no
 * XP, session, mastery or evidence write — a fight changes nothing outside
 * itself (`noAppStateWrites.test.ts`). Hit points and cooldowns live here; the
 * screen only draws the state and feeds answers in.
 *
 * A round: the learner sees a sentence in English, picks a move, and types it
 * in French. A correct answer resolves the move; a wrong one lets the boss hit
 * back. Every few rounds the boss also lands a telegraphed heavy blow, which a
 * Guard (raised by a correct answer) blocks.
 */

// ── tuning ───────────────────────────────────────────────────────────────────
export const PLAYER_MAX_HP = 100;
export const FOCUS_MAX = 3;
export const POWER_COST = 2;
export const MEND_COST = 1;
export const MEND_AMOUNT = 20;
export const STRIKE_BASE = 14;
/** Each correct answer in a row adds this much to the next strike… */
export const COMBO_STEP = 2;
/** …up to this many streak steps (so +10 at most). */
export const COMBO_STEP_CAP = 5;
export const POWER_MULTIPLIER = 2;
/** A wrong answer on a Power move costs half again as much. */
export const POWER_MISS_MULTIPLIER = 1.5;
export const COUNTER_DAMAGE = { 1: 12, 2: 16 } as const;
export const HEAVY_DAMAGE = { 1: 14, 2: 18 } as const;
/** Rounds between heavy blows, by phase. */
export const HEAVY_EVERY = { 1: 4, 2: 3 } as const;
export const POISON_DAMAGE = 3;
export const POISON_CURE_STREAK = 2;
export const LOCK_ROUNDS = 2;
export const TIMER_SECONDS = 15;

export type Phase = 1 | 2;
export type Move = 'strike' | 'power' | 'guard' | 'mend';
export const MOVES: readonly Move[] = ['strike', 'power', 'guard', 'mend'];
type Lockable = Exclude<Move, 'strike'>;
const LOCK_ORDER: readonly Lockable[] = ['power', 'guard', 'mend'];

export type BattleEvent =
  | { type: 'strike'; damage: number; power: boolean }
  | { type: 'guard-up' }
  | { type: 'heal'; amount: number }
  | { type: 'counter'; damage: number }
  | { type: 'heavy'; damage: number }
  | { type: 'blocked'; source: 'counter' | 'heavy' }
  | { type: 'phase2' }
  | { type: 'poisoned' }
  | { type: 'poison-tick'; damage: number }
  | { type: 'cured' }
  | { type: 'stunned' }
  | { type: 'locked'; move: Lockable }
  | { type: 'timeout' }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface RoundResult {
  question: BossQuestion;
  typed: string;
  move: Move;
  correct: boolean;
  timedOut: boolean;
  events: readonly BattleEvent[];
}

export interface Miss {
  question: BossQuestion;
  typed: string;
  timedOut: boolean;
}

export interface BattleStats {
  correct: number;
  wrong: number;
  blocked: number;
  maxCombo: number;
}

export type Stage = 'answering' | 'resolved' | 'won' | 'lost';

export interface BattleState {
  boss: Boss;
  stage: Stage;
  /** 1-based number of the round being played (or just played). */
  round: number;
  phase: Phase;
  bossHp: number;
  playerHp: number;
  focus: number;
  combo: number;
  guard: boolean;
  /** Rounds until the boss's next heavy blow; 1 means this round. */
  heavyIn: number;
  poisoned: boolean;
  /** Correct answers in a row while poisoned. */
  cure: number;
  /** Set by an unblocked heavy blow from a stunning boss: the next round is Strike only. */
  stunned: boolean;
  lock: { move: Lockable; rounds: number } | null;
  lockCursor: number;
  /** The learner cleared this round's fog. */
  fogCleared: boolean;
  deck: readonly BossQuestion[];
  cursor: number;
  seed: number;
  /** What the boss last said. */
  speech: string;
  last: RoundResult | null;
  misses: readonly Miss[];
  stats: BattleStats;
}

// ── seeded shuffle ───────────────────────────────────────────────────────────
function random(seed: number): [value: number, next: number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function shuffle<T>(items: readonly T[], seed: number): [T[], number] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const [r, next] = random(s);
    s = next;
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}

/**
 * A fresh deal of the fight's questions that does not open with the question just asked. One bank is a plain
 * shuffle. With several (the Gauntlet) each bank is shuffled and then dealt in rounds of one question per
 * topic, each round in a random order, so the topics keep changing and no topic runs dry early.
 */
function freshDeck(boss: Boss, seed: number, avoidFirst?: string): [BossQuestion[], number] {
  const banks = banksFor(boss.id);
  let deck: BossQuestion[];
  let next = seed;
  if (banks.length === 1) {
    [deck, next] = shuffle(banks[0], seed);
  } else {
    const shuffled = banks.map((bank) => {
      const [dealt, after] = shuffle(bank, next);
      next = after;
      return dealt;
    });
    deck = [];
    const longest = Math.max(...shuffled.map((bank) => bank.length));
    for (let i = 0; i < longest; i++) {
      const [round, after] = shuffle(shuffled.filter((bank) => i < bank.length).map((bank) => bank[i]), next);
      next = after;
      deck.push(...round);
    }
  }
  if (avoidFirst && deck.length > 1 && deck[0].id === avoidFirst) [deck[0], deck[1]] = [deck[1], deck[0]];
  return [deck, next];
}

// ── set-up ───────────────────────────────────────────────────────────────────
export function createBattle(boss: Boss, seed: number): BattleState {
  const [deck, next] = freshDeck(boss, seed >>> 0);
  return {
    boss,
    stage: 'answering',
    round: 1,
    phase: 1,
    bossHp: boss.hp,
    playerHp: PLAYER_MAX_HP,
    focus: 0,
    combo: 0,
    guard: false,
    heavyIn: HEAVY_EVERY[1],
    poisoned: false,
    cure: 0,
    stunned: false,
    lock: null,
    lockCursor: 0,
    fogCleared: false,
    deck,
    cursor: 0,
    seed: next,
    speech: bossLine(boss, 'intro', 0),
    last: null,
    misses: [],
    stats: { correct: 0, wrong: 0, blocked: 0, maxCombo: 0 },
  };
}

export function currentQuestion(state: BattleState): BossQuestion {
  return state.deck[state.cursor];
}

// ── what the learner may do ──────────────────────────────────────────────────
export interface MoveStatus {
  usable: boolean;
  /** Why not, in a few words — shown on the disabled move. */
  reason: string | null;
}

export function moveStatus(state: BattleState, move: Move): MoveStatus {
  if (move === 'strike') return { usable: true, reason: null };
  if (state.stunned) return { usable: false, reason: 'Stunned' };
  if (state.lock?.move === move) return { usable: false, reason: 'Locked' };
  if (move === 'power' && state.focus < POWER_COST) return { usable: false, reason: `Needs ${POWER_COST} Focus` };
  if (move === 'mend') {
    if (state.focus < MEND_COST) return { usable: false, reason: `Needs ${MEND_COST} Focus` };
    if (state.playerHp >= PLAYER_MAX_HP) return { usable: false, reason: 'Full health' };
  }
  if (move === 'guard' && state.guard) return { usable: false, reason: 'Already up' };
  return { usable: true, reason: null };
}

/** The damage a correct strike (or power strike) deals at this combo (`combo` already counts the new answer). */
export function strikeDamage(combo: number, power: boolean): number {
  const bonus = Math.min(Math.max(combo - 1, 0), COMBO_STEP_CAP) * COMBO_STEP;
  return (STRIKE_BASE + bonus) * (power ? POWER_MULTIPLIER : 1);
}

export function isFogActive(state: BattleState): boolean {
  return state.boss.mechanic === 'fog' && state.phase === 2 && !state.fogCleared && state.stage === 'answering';
}

/** Half of the words kept, the rest hidden: what the learner sees through the fog. */
export function veilPrompt(english: string): string {
  const words = english.split(/\s+/).filter(Boolean);
  if (words.length < 2) return '···';
  const keep = Math.ceil(words.length / 2);
  return [...words.slice(0, keep), ...words.slice(keep).map(() => '···')].join(' ');
}

/** Seconds on this round's clock, or null when there is none. */
export function roundSeconds(state: BattleState): number | null {
  if (state.boss.mechanic !== 'timer') return null;
  return state.phase === 2 ? TIMER_SECONDS : (state.boss.openingClock ?? null);
}

/** Clearing the fog is allowed once a round, and breaks the combo. */
export function clearFog(state: BattleState): BattleState {
  if (!isFogActive(state)) return state;
  return { ...state, fogCleared: true, combo: 0 };
}

// ── a round ──────────────────────────────────────────────────────────────────
export interface RoundInput {
  typed: string;
  move: Move;
  /** The clock ran out before an answer was sent. */
  timedOut?: boolean;
}

export function resolveRound(state: BattleState, input: RoundInput): BattleState {
  if (state.stage !== 'answering') return state;

  const { boss } = state;
  const question = currentQuestion(state);
  const move = moveStatus(state, input.move).usable ? input.move : 'strike';
  const timedOut = input.timedOut === true;
  const correct = !timedOut && isCorrectAnswer(question, input.typed);
  const events: BattleEvent[] = [];

  let { bossHp, playerHp, focus, combo, guard, heavyIn, poisoned, cure, lockCursor } = state;
  let phase = state.phase;
  // The boss acts at the strength it had when the round began: turning enraged mid-round only counts from the next one.
  const actingPhase = state.phase;
  let stunned = false;
  let newLock: BattleState['lock'] = null;
  const poisonedAtStart = state.poisoned;

  // Costs are paid whether or not the answer lands.
  if (move === 'power') focus -= POWER_COST;
  if (move === 'mend') focus -= MEND_COST;
  if (timedOut) events.push({ type: 'timeout' });

  // 1. The learner's move.
  if (correct) {
    combo += 1;
    focus = Math.min(FOCUS_MAX, focus + 1);
    if (move === 'strike' || move === 'power') {
      const damage = strikeDamage(combo, move === 'power');
      bossHp = Math.max(0, bossHp - damage);
      events.push({ type: 'strike', damage, power: move === 'power' });
    } else if (move === 'guard') {
      guard = true;
      events.push({ type: 'guard-up' });
    } else {
      const amount = Math.min(MEND_AMOUNT, PLAYER_MAX_HP - playerHp);
      playerHp += amount;
      events.push({ type: 'heal', amount });
    }
    if (poisoned) {
      cure += 1;
      if (cure >= POISON_CURE_STREAK) {
        poisoned = false;
        cure = 0;
        events.push({ type: 'cured' });
      }
    }
  } else {
    combo = 0;
    cure = 0;
  }

  if (phase === 1 && bossHp > 0 && bossHp <= boss.hp / 2) {
    phase = 2;
    events.push({ type: 'phase2' });
  }

  const stats: BattleStats = {
    correct: state.stats.correct + (correct ? 1 : 0),
    wrong: state.stats.wrong + (correct ? 0 : 1),
    blocked: state.stats.blocked,
    maxCombo: Math.max(state.stats.maxCombo, combo),
  };
  const misses = correct ? state.misses : addMiss(state.misses, { question, typed: input.typed, timedOut });

  const finish = (stage: Stage, speech: string): BattleState => ({
    ...state,
    stage,
    phase,
    bossHp,
    playerHp,
    focus,
    combo,
    guard,
    heavyIn,
    poisoned,
    cure,
    stunned,
    lock: newLock ?? decayLock(state.lock),
    lockCursor,
    speech,
    last: { question, typed: input.typed, move, correct, timedOut, events },
    misses,
    stats,
  });

  // 2. The boss falls before it can answer.
  if (bossHp <= 0) {
    events.push({ type: 'victory' });
    return finish('won', bossLine(boss, 'beaten', state.round));
  }

  // 3. The boss hits back after a miss.
  if (!correct) {
    let damage: number = COUNTER_DAMAGE[actingPhase];
    if (move === 'power') damage = Math.round(damage * POWER_MISS_MULTIPLIER);
    if (guard) {
      guard = false;
      stats.blocked += 1;
      events.push({ type: 'blocked', source: 'counter' });
    } else {
      playerHp -= damage;
      events.push({ type: 'counter', damage });
    }
    if (boss.mechanic === 'poison' && !poisoned) {
      poisoned = true;
      cure = 0;
      events.push({ type: 'poisoned' });
    }
    if (boss.mechanic === 'lock') {
      const locked = LOCK_ORDER[lockCursor % LOCK_ORDER.length];
      lockCursor += 1;
      newLock = { move: locked, rounds: LOCK_ROUNDS };
      events.push({ type: 'locked', move: locked });
    }
  }

  // 4. The telegraphed heavy blow.
  heavyIn -= 1;
  if (heavyIn <= 0) {
    heavyIn = HEAVY_EVERY[phase];
    if (playerHp > 0) {
      if (guard) {
        guard = false;
        stats.blocked += 1;
        events.push({ type: 'blocked', source: 'heavy' });
      } else {
        const damage = HEAVY_DAMAGE[actingPhase];
        playerHp -= damage;
        events.push({ type: 'heavy', damage });
        if (boss.mechanic === 'stun') {
          stunned = true;
          events.push({ type: 'stunned' });
        }
      }
    }
  }

  // 5. Poison works on whoever was already poisoned at the start of the round — and never finishes anyone off.
  if (poisoned && poisonedAtStart && playerHp > 1) {
    const damage = Math.min(POISON_DAMAGE, playerHp - 1);
    playerHp -= damage;
    events.push({ type: 'poison-tick', damage });
  }

  if (playerHp <= 0) {
    playerHp = 0;
    events.push({ type: 'defeat' });
    return finish('lost', bossLine(boss, 'wins', state.round));
  }

  const moment = events.some((e) => e.type === 'phase2') ? 'enraged' : correct ? 'hurt' : 'gloat';
  return finish('resolved', bossLine(boss, moment, state.round));
}

function addMiss(misses: readonly Miss[], miss: Miss): readonly Miss[] {
  return misses.some((m) => m.question.id === miss.question.id) ? misses : [...misses, miss];
}

function decayLock(lock: BattleState['lock']): BattleState['lock'] {
  return lock && lock.rounds > 1 ? { ...lock, rounds: lock.rounds - 1 } : null;
}

/** Move on to the next question after a resolved round. */
export function nextRound(state: BattleState): BattleState {
  if (state.stage !== 'resolved') return state;
  let { deck, cursor, seed } = state;
  cursor += 1;
  if (cursor >= deck.length) {
    [deck, seed] = freshDeck(state.boss, seed, deck[deck.length - 1]?.id);
    cursor = 0;
  }
  return { ...state, stage: 'answering', round: state.round + 1, deck, cursor, seed, fogCleared: false, last: null };
}

// ── the end ──────────────────────────────────────────────────────────────────
export type Stars = 0 | 1 | 2 | 3;

/** 1 star for a win, 2 with at least half your health left, 3 with 80 or more. */
export function starsFor(state: Pick<BattleState, 'stage' | 'playerHp'>): Stars {
  if (state.stage !== 'won') return 0;
  if (state.playerHp >= 80) return 3;
  if (state.playerHp >= 50) return 2;
  return 1;
}

export interface BattleSummary {
  won: boolean;
  stars: Stars;
  /** Rounds played. */
  rounds: number;
  correct: number;
  wrong: number;
  /** Whole percent of answers that were right. */
  accuracy: number;
  maxCombo: number;
  hpLeft: number;
  blocked: number;
  misses: readonly Miss[];
}

export function summarize(state: BattleState): BattleSummary {
  const answered = state.stats.correct + state.stats.wrong;
  return {
    won: state.stage === 'won',
    stars: starsFor(state),
    rounds: answered,
    correct: state.stats.correct,
    wrong: state.stats.wrong,
    accuracy: answered === 0 ? 0 : Math.round((state.stats.correct / answered) * 100),
    maxCombo: state.stats.maxCombo,
    hpLeft: state.playerHp,
    blocked: state.stats.blocked,
    misses: state.misses,
  };
}
