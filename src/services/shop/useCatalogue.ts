import { useEffect, useState } from 'react';
import type { ShopItem } from '../../types/shop';
import { getCatalogue } from './shopService';

let cache: ShopItem[] | null = null;
let inflight: Promise<ShopItem[]> | null = null;

/**
 * Shared read of the live shop_items catalogue for cosmetic rendering
 * (frame/nameplate rarity in CosmeticPreview). Public, unauthenticated,
 * rarely changes — cached in module scope for the tab's lifetime rather
 * than refetched by every TopContextBar/Profile/Rankings row.
 */
export function useCatalogue(): ShopItem[] {
  const [items, setItems] = useState<ShopItem[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    if (!inflight) inflight = getCatalogue().then(result => { cache = result; return result; });
    let cancelled = false;
    void inflight.then(result => { if (!cancelled) setItems(result); });
    return () => { cancelled = true; };
  }, []);

  return items;
}
