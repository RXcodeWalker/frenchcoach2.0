/**
 * Shop economy — the single writer (Shop plan §14.6, §14.1).
 *
 * server = economic truth (shop_items owns id/price/kind/max_owned/
 * requirement; gem_events is the sole balance authority — balance =
 * SUM(delta); user_inventory owns qty). This module is the only place in
 * the frontend that calls the four hardened SECURITY DEFINER RPCs
 * (purchase_shop_item, equip_cosmetic, consume_item, mint_gems) — every
 * other module reads through these functions, never `supabase.rpc()`
 * directly, and error codes are translated to ShopError so callers never
 * parse Postgres error strings.
 *
 * Follows the .rpc() error-handling shape used across src/services/social/
 * (friendsService.ts, blockService.ts, usernameService.ts): no throw across
 * a raw PostgrestError, map known codes, warn+return on the rest.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import type {
  ShopItem,
  GemEvent,
  InventoryEntry,
  EquipSlot,
  PurchaseResult,
  MintResult,
  ConsumeResult,
  ShopErrorCode,
} from '../../types/shop';
import { ShopError } from '../../types/shop';

const KNOWN_CODES: ShopErrorCode[] = [
  'not_authenticated',
  'unknown_item',
  'insufficient_gems',
  'requirement_not_met',
  'already_owned',
  'invalid_slot',
  'not_owned',
  'invalid_amount',
  'invalid_occurred_at',
];

function mapRpcError(message: string): ShopError {
  const found = KNOWN_CODES.find(code => message.includes(code));
  return new ShopError(found ?? 'network_error', message);
}

export function makeIdempotencyKey(): string {
  return `shop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Catalogue (public read, no auth required) ───────────────────────────────

function rowToShopItem(row: {
  id: string;
  kind: string;
  price_gems: number;
  consumable: boolean;
  max_owned: number | null;
  requirement: Record<string, unknown>;
  emoji: string | null;
  active: boolean;
  sort_order: number;
}): ShopItem {
  return {
    id: row.id,
    kind: row.kind as ShopItem['kind'],
    priceGems: row.price_gems,
    consumable: row.consumable,
    maxOwned: row.max_owned,
    requirement: row.requirement as ShopItem['requirement'],
    emoji: row.emoji,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export async function getCatalogue(): Promise<ShopItem[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('shop_items')
      .select('id, kind, price_gems, consumable, max_owned, requirement, emoji, active, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('[shopService] getCatalogue failed:', error.message);
      return [];
    }
    return (data ?? []).map(rowToShopItem);
  } catch (err) {
    console.warn('[shopService] getCatalogue error:', err);
    return [];
  }
}

// ── Balance ──────────────────────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<number> {
  if (!supabaseConfigured) return 0;
  try {
    const { data, error } = await supabase
      .from('gem_events')
      .select('delta')
      .eq('user_id', userId);

    if (error) {
      console.warn('[shopService] getBalance failed:', error.message);
      return 0;
    }
    return (data ?? []).reduce((sum, row) => sum + (row.delta as number), 0);
  } catch (err) {
    console.warn('[shopService] getBalance error:', err);
    return 0;
  }
}

export async function getTransactionHistory(userId: string): Promise<GemEvent[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('gem_events')
      .select('id, delta, kind, item_id, created_at, occurred_at')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false });

    if (error) {
      console.warn('[shopService] getTransactionHistory failed:', error.message);
      return [];
    }
    return (data ?? []).map(row => ({
      id: row.id as string,
      delta: row.delta as number,
      kind: row.kind as GemEvent['kind'],
      itemId: (row.item_id as string | null) ?? null,
      createdAt: row.created_at as string,
      occurredAt: row.occurred_at as string,
    }));
  } catch (err) {
    console.warn('[shopService] getTransactionHistory error:', err);
    return [];
  }
}

// ── Inventory ────────────────────────────────────────────────────────────────

/** Balance + inventory in the shape AppContext's SET_ECONOMY action expects. */
export async function getEconomySnapshot(
  userId: string
): Promise<{ balance: number; inventory: Record<string, number> }> {
  const [balance, entries] = await Promise.all([getBalance(userId), getInventory(userId)]);
  const inventory: Record<string, number> = {};
  for (const entry of entries) inventory[entry.itemId] = entry.qty;
  return { balance, inventory };
}

export async function getInventory(userId: string): Promise<InventoryEntry[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('user_inventory')
      .select('item_id, qty, acquired_at')
      .eq('user_id', userId);

    if (error) {
      console.warn('[shopService] getInventory failed:', error.message);
      return [];
    }
    return (data ?? []).map(row => ({
      itemId: row.item_id as string,
      qty: row.qty as number,
      acquiredAt: row.acquired_at as string,
    }));
  } catch (err) {
    console.warn('[shopService] getInventory error:', err);
    return [];
  }
}

// ── Mutating RPCs ────────────────────────────────────────────────────────────

export async function purchase(itemId: string, idempotencyKey: string): Promise<PurchaseResult> {
  if (!supabaseConfigured) throw new ShopError('network_error', 'offline');
  const { data, error } = await supabase.rpc('purchase_shop_item', {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw mapRpcError(error.message);
  return data as PurchaseResult;
}

export async function equip(slot: EquipSlot, itemId: string | null): Promise<void> {
  if (!supabaseConfigured) throw new ShopError('network_error', 'offline');
  const { error } = await supabase.rpc('equip_cosmetic', {
    p_slot: slot,
    p_item_id: itemId,
  });
  if (error) throw mapRpcError(error.message);
}

export async function consume(itemId: string, idempotencyKey: string): Promise<ConsumeResult> {
  if (!supabaseConfigured) throw new ShopError('network_error', 'offline');
  const { data, error } = await supabase.rpc('consume_item', {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw mapRpcError(error.message);
  return data as ConsumeResult;
}

export async function mint(
  idempotencyKey: string,
  amount: number,
  occurredAt: string
): Promise<MintResult> {
  if (!supabaseConfigured) throw new ShopError('network_error', 'offline');
  const { data, error } = await supabase.rpc('mint_gems', {
    p_idempotency_key: idempotencyKey,
    p_amount: amount,
    p_occurred_at: occurredAt,
  });
  if (error) throw mapRpcError(error.message);
  return data as MintResult;
}
