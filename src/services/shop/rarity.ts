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

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#64748B',
  rare: '#10B981',
  epic: '#6366F1',
  legendary: '#F59E0B',
};
