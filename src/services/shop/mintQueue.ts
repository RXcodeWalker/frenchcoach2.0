/**
 * Gem minting — client-side queue for the server-authoritative mint_gems RPC
 * (Shop plan §14.1). awardXP/awardParticipationXP/awardGemsForXP no longer
 * write gems locally; they enqueue a mint request here instead. The gems
 * shown before the mint round-trip resolves is a provisional display value
 * (progressionService's local `gems` counter), reconciled to the server
 * balance once the mint call succeeds — never treated as authoritative.
 *
 * Reuses the pendingSyncXpEventIds queue pattern (syncQueue.ts): a mint
 * request is appended synchronously at award time, attempted immediately if
 * online+authed, and left in the queue on failure for the next flush
 * (reconnect, next award, or explicit flush call). Every queued request
 * carries its own idempotency key, generated once at enqueue time — replays
 * of the same request (retry after a lost response) reuse that key, so
 * mint_gems' replay guard makes retries a no-op instead of a double-mint.
 */

import { supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { mint, makeIdempotencyKey } from './shopService';
import { ShopError } from '../../types/shop';

export interface PendingMint {
  key: string;
  amount: number;
  occurredAt: string;
}

const MAX_QUEUE = 500; // generous bound; a real user mints at most a few times/session

function getQueue(): PendingMint[] {
  return storageGet<PendingMint[]>(STORAGE_KEYS.pendingMintQueue, []);
}

function setQueue(queue: PendingMint[]): void {
  storageSet(STORAGE_KEYS.pendingMintQueue, queue.slice(-MAX_QUEUE));
}

/** Appends a mint request to the local queue synchronously, before any network attempt. */
export function enqueueMint(amount: number, occurredAt: string = new Date().toISOString()): PendingMint {
  const request: PendingMint = { key: makeIdempotencyKey(), amount, occurredAt };
  setQueue([...getQueue(), request]);
  return request;
}

/**
 * Attempts to mint every queued request in order. Each success removes that
 * entry from the queue; each failure leaves the remaining queue (including
 * the failed entry) intact for the next flush. Returns the final server
 * balance if any mint call succeeded, else null (nothing changed, or
 * offline/unauthenticated).
 */
export async function flushMintQueue(): Promise<number | null> {
  if (!supabaseConfigured) return null;
  const queue = getQueue();
  if (queue.length === 0) return null;

  let lastBalance: number | null = null;
  const remaining = [...queue];

  while (remaining.length > 0) {
    const request = remaining[0];
    try {
      const result = await mint(request.key, request.amount, request.occurredAt);
      lastBalance = result.balance;
      remaining.shift();
      setQueue(remaining);
    } catch (err) {
      if (err instanceof ShopError && err.code === 'not_authenticated') {
        // Not signed in yet — leave the whole queue for the next flush.
        break;
      }
      console.warn('[mintQueue] flush failed, will retry later:', err);
      break;
    }
  }

  return lastBalance;
}

export function getPendingMintCount(): number {
  return getQueue().length;
}
