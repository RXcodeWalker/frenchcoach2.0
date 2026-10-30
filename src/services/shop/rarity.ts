/**
 * Rarity is derived, not authored (Shop plan §7): "common (no req) → rare
 * (req, <900) → epic (<1600) → legendary (≥1600)". Computed from a live
 * shop_items row (price + requirement) — never stored, never part of
 * shopCatalogue.ts's presentation-only data.
 */

import type { ShopItem } from '../../types/shop';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export function rarityOf(item: Pick<ShopItem, 'priceGems' | 'requirement'>): Rarity {
  const hasRequirement = !!item.requirement?.achievement;
  if (!hasRequirement) return 'common';
  if (item.priceGems < 900) return 'rare';
  if (item.priceGems < 1600) return 'epic';
  return 'legendary';
}

/**
 * Rarity colours are Design System v2 role tokens (never hex), so they follow
 * the theme: `RARITY_COLOR` is for text (the `-text` step, AA on a surface),
 * `RARITY_RING` for a 1px ring or fill (the base step).
 */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--ink-muted)',
  rare: 'var(--progress-text)',
  epic: 'var(--action-text)',
  legendary: 'var(--reward-text)',
};

export const RARITY_RING: Record<Rarity, string> = {
  common: 'var(--hairline-strong)',
  rare: 'var(--progress)',
  epic: 'var(--action)',
  legendary: 'var(--reward)',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
