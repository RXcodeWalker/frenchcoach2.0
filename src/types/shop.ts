// Shop economy types (Shop plan §14.6). Server owns id/price/kind/max_owned/
// requirement (shop_items); these types mirror that shape for the client.

export type ShopItemKind = 'consumable' | 'avatar' | 'frame' | 'nameplate';

export type EquipSlot = 'avatar' | 'frame' | 'nameplate';

export interface ShopItemRequirement {
  achievement?: string;
}

/** Server-owned economic facts for one item (shop_items row, presentation fields excluded). */
export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  priceGems: number;
  consumable: boolean;
  maxOwned: number | null;
  requirement: ShopItemRequirement;
  emoji: string | null;
  active: boolean;
  sortOrder: number;
}

export interface GemEvent {
  id: string;
  delta: number;
  kind: 'earn' | 'purchase' | 'spend' | 'refund' | 'grant';
  itemId: string | null;
  createdAt: string;
  occurredAt: string;
}

export interface InventoryEntry {
  itemId: string;
  qty: number;
  acquiredAt: string;
}

export interface EquippedCosmetics {
  avatar: string | null;
  frame: string | null;
  nameplate: string | null;
}

export interface PurchaseResult {
  ok: true;
  balance: number;
  qty?: number;
  replayed?: boolean;
}

export interface MintResult {
  ok: true;
  balance: number;
  capped?: boolean;
  replayed?: boolean;
}

export interface ConsumeResult {
  ok: true;
  qty: number;
  replayed?: boolean;
}

/** Stable error codes raised by the shop RPCs (Shop plan §14.3). */
export type ShopErrorCode =
  | 'not_authenticated'
  | 'unknown_item'
  | 'insufficient_gems'
  | 'requirement_not_met'
  | 'already_owned'
  | 'invalid_slot'
  | 'not_owned'
  | 'invalid_amount'
  | 'invalid_occurred_at'
  | 'network_error'
  | 'not_signed_in';

export class ShopError extends Error {
  code: ShopErrorCode;
  constructor(code: ShopErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'ShopError';
  }
}
