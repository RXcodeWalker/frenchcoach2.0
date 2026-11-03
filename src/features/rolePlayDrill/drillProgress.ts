/**
 * Role-play drill progress, derived — never stored. Each answered exchange is
 * already a `Session` (mode `story`) in the analytics history; its id names
 * the card and the exchange, so "which cards have I done?" is read back from
 * that history instead of a second store (CLAUDE.md core rule 4).
 */
import type { StoryCard } from '../../data/storyCards';

const PREFIX = 'story-';

/** `story-<cardId>-<timestamp>-<step>`; the step is the 0-based task index. */
export function drillSessionId(cardId: string, step: number, now: number = Date.now()): string {
  return `${PREFIX}${cardId}-${now}-${step}`;
}

/** The card id and step a drill session id names, or null for any other id (including pre-drill `story-<ts>-<step>` ids). */
export function parseDrillSessionId(id: string): { cardId: string; step: number } | null {
  const m = /^story-(.+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { cardId: m[1], step: Number(m[3]) };
}

export interface CardProgress {
  /** Distinct exchanges ever answered on this card. */
  answered: number;
  total: number;
  /** Every exchange answered at least once. */
  done: boolean;
}

/** Progress per card id, from the stored session ids. Unknown cards and out-of-range steps are ignored. */
export function cardProgress(cards: StoryCard[], sessionIds: string[]): Map<string, CardProgress> {
  const steps = new Map<string, Set<number>>();
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const id of sessionIds) {
    const parsed = parseDrillSessionId(id);
    if (!parsed) continue;
    const card = byId.get(parsed.cardId);
    if (!card || parsed.step >= card.tasks.length) continue;
    const set = steps.get(parsed.cardId) ?? new Set<number>();
    set.add(parsed.step);
    steps.set(parsed.cardId, set);
  }
  const out = new Map<string, CardProgress>();
  for (const card of cards) {
    const answered = steps.get(card.id)?.size ?? 0;
    out.set(card.id, { answered, total: card.tasks.length, done: card.tasks.length > 0 && answered >= card.tasks.length });
  }
  return out;
}

/**
 * "Surprise me": a random card not yet done (any card once all are done),
 * never the one just played when there is another choice.
 */
export function pickNextCard(
  cards: StoryCard[],
  progress: Map<string, CardProgress>,
  excludeId: string | null = null,
  random: () => number = Math.random,
): StoryCard | null {
  if (cards.length === 0) return null;
  const notDone = cards.filter((c) => !progress.get(c.id)?.done);
  let pool = notDone.length > 0 ? notDone : cards;
  if (excludeId && pool.length > 1) pool = pool.filter((c) => c.id !== excludeId);
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}
