/**
 * Mission rewards (junior-track §10; ADR 0012 rule 4).
 *
 * A sticker rewards FINISHING a mission, never accuracy. `nextReward` takes the
 * theme and the stickers already earned — and nothing else. It has no parameter
 * for outcomes, turn results or a Postcard, so accuracy cannot reach rewards by
 * construction; an all-"none" mission earns exactly the same sticker as an
 * all-"got it" one (asserted in rewards.test.ts).
 *
 *  - Each finished mission earns the next sticker of the theme's set, in order.
 *  - The mission that completes the set also gives the theme's unlock (a Léo
 *    outfit or a background), once.
 *  - After that, each finished mission earns a gold version, in set order; when
 *    every gold one is earned, gold versions repeat in the same order.
 *
 * A started but unfinished mission earns nothing (the caller only asks on finish).
 * Pure.
 */
import type { JuniorSticker, JuniorTheme, JuniorUnlock } from '../../data/junior/types';

export interface EarnedSticker {
  stickerId: string;
  gold: boolean;
}

export interface MissionReward {
  sticker: JuniorSticker;
  gold: boolean;
  /** Set only on the mission that completes the theme's set. */
  unlock: JuniorUnlock | null;
}

export function nextReward(theme: JuniorTheme, earned: readonly EarnedSticker[]): MissionReward {
  if (theme.stickers.length === 0) throw new Error(`Junior theme ${theme.id} has no stickers`);
  const ids = new Set(theme.stickers.map((s) => s.id));
  const mine = earned.filter((e) => ids.has(e.stickerId));
  const normal = new Set(mine.filter((e) => !e.gold).map((e) => e.stickerId));

  const nextNormal = theme.stickers.find((s) => !normal.has(s.id));
  if (nextNormal) {
    const completesSet = theme.stickers.every((s) => s.id === nextNormal.id || normal.has(s.id));
    return { sticker: nextNormal, gold: false, unlock: completesSet ? theme.unlock : null };
  }

  const goldCount = mine.filter((e) => e.gold).length;
  return { sticker: theme.stickers[goldCount % theme.stickers.length], gold: true, unlock: null };
}
