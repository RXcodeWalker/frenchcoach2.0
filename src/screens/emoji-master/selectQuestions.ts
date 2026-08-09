import type { EmojiQuestion } from '../../data/emojiQuestions';
import type { EmojiCategory, GameMode } from './types';
import { FIXED_RUN_LENGTH, MIN_POOL_SIZE } from './types';
import { preferredDifficulties } from './modes/arenaCombat';

export type Rng = () => number;

export interface SelectQuestionsOptions {
  category: EmojiCategory;
  mode: GameMode;
  count?: number;
  bossHpRatio?: number;
  excludeRecentIds?: string[];
}

function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeByDifficulty(
  pool: EmojiQuestion[],
  difficulty: 1 | 2 | 3,
  n: number,
  used: Set<string>
): EmojiQuestion[] {
  const out: EmojiQuestion[] = [];
  for (const q of pool) {
    if (out.length >= n) break;
    if (q.difficulty !== difficulty) continue;
    if (used.has(q.id)) continue;
    used.add(q.id);
    out.push(q);
  }
  return out;
}

/** Pad filtered pool from all when below MIN_POOL_SIZE. Prefer same difficulty. */
export function ensureMinPool(
  filtered: EmojiQuestion[],
  all: EmojiQuestion[],
  rng: Rng
): EmojiQuestion[] {
  if (filtered.length >= MIN_POOL_SIZE) return [...filtered];

  const ids = new Set(filtered.map((q) => q.id));
  const result = [...filtered];
  const needed = MIN_POOL_SIZE - filtered.length;

  const sameDiffCandidates = shuffleInPlace(
    all.filter(
      (q) =>
        !ids.has(q.id) &&
        filtered.some((f) => f.difficulty === q.difficulty)
    ),
    rng
  );
  const anyCandidates = shuffleInPlace(
    all.filter((q) => !ids.has(q.id)),
    rng
  );

  for (const q of [...sameDiffCandidates, ...anyCandidates]) {
    if (result.length >= filtered.length + needed) break;
    if (ids.has(q.id)) continue;
    ids.add(q.id);
    result.push(q);
  }

  return result;
}

function buildEligiblePool(
  pool: EmojiQuestion[],
  category: EmojiCategory,
  rng: Rng
): EmojiQuestion[] {
  const filtered =
    category === 'all' ? [...pool] : pool.filter((q) => q.category === category);
  return ensureMinPool(filtered, pool, rng);
}

/** Fixed 10-question mix: 4 easy / 4 medium / 2 hard, falling back to remainder. */
export function selectFixedRun(
  eligible: EmojiQuestion[],
  rng: Rng,
  count = FIXED_RUN_LENGTH
): EmojiQuestion[] {
  const shuffled = shuffleInPlace([...eligible], rng);
  const used = new Set<string>();
  const easy = takeByDifficulty(shuffled, 1, 4, used);
  const medium = takeByDifficulty(shuffled, 2, 4, used);
  const hard = takeByDifficulty(shuffled, 3, 2, used);
  const selected = [...easy, ...medium, ...hard];

  if (selected.length < count) {
    for (const q of shuffled) {
      if (selected.length >= count) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      selected.push(q);
    }
  }

  return shuffleInPlace(selected.slice(0, count), rng);
}

/**
 * Draw next question without replacement; on exhaustion reshuffle excluding
 * last 3 shown when pool size allows.
 */
export function drawNextQuestion(
  eligible: EmojiQuestion[],
  remaining: EmojiQuestion[],
  recentIds: string[],
  rng: Rng,
  bossHpRatio?: number
): { question: EmojiQuestion; remaining: EmojiQuestion[] } {
  let deck = remaining.length > 0 ? remaining : [];

  if (deck.length === 0) {
    const exclude =
      eligible.length > 3 ? new Set(recentIds.slice(-3)) : new Set<string>();
    deck = shuffleInPlace(
      eligible.filter((q) => !exclude.has(q.id)),
      rng
    );
    // If exclusion wiped the deck (tiny pool), fall back to full eligible.
    if (deck.length === 0) {
      deck = shuffleInPlace([...eligible], rng);
    }
  }

  let pickIndex = 0;
  if (bossHpRatio !== undefined) {
    const preferred = preferredDifficulties(bossHpRatio);
    const preferredIdx = deck.findIndex((q) => preferred.includes(q.difficulty));
    if (preferredIdx >= 0) pickIndex = preferredIdx;
  }

  const question = deck[pickIndex];
  const nextRemaining = [...deck.slice(0, pickIndex), ...deck.slice(pickIndex + 1)];
  return { question, remaining: nextRemaining };
}

export function selectQuestions(
  pool: EmojiQuestion[],
  options: SelectQuestionsOptions,
  rng: Rng = Math.random
): EmojiQuestion[] {
  const eligible = buildEligiblePool(pool, options.category, rng);
  const count = options.count ?? FIXED_RUN_LENGTH;

  if (
    options.mode === 'classic' ||
    options.mode === 'reverse' ||
    options.mode === 'hardcore'
  ) {
    return selectFixedRun(eligible, rng, count);
  }

  // Blitz / Arena: return a shuffled eligible deck (draw-as-needed at runtime).
  const exclude = new Set(options.excludeRecentIds ?? []);
  let deck = eligible.filter((q) => !exclude.has(q.id));
  if (deck.length === 0) deck = [...eligible];

  if (options.mode === 'arena' && options.bossHpRatio !== undefined) {
    // Soft sort: preferred difficulties first, then shuffle within bands.
    const preferred = preferredDifficulties(options.bossHpRatio);
    const preferredQs = shuffleInPlace(
      deck.filter((q) => preferred.includes(q.difficulty)),
      rng
    );
    const otherQs = shuffleInPlace(
      deck.filter((q) => !preferred.includes(q.difficulty)),
      rng
    );
    return [...preferredQs, ...otherQs];
  }

  return shuffleInPlace([...deck], rng);
}

export function buildEligiblePoolForRun(
  pool: EmojiQuestion[],
  category: EmojiCategory,
  rng: Rng = Math.random
): EmojiQuestion[] {
  return buildEligiblePool(pool, category, rng);
}
