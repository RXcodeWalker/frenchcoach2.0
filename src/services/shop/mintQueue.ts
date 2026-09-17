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
 *
 * MINT_MAX and why enqueueMint splits: mint_gems bounds p_amount to 1..20 and
 * raises `invalid_amount` outside it (20260811104000_phase1_shop_rpcs.sql).
 * Award sizes are not all under that bound — Challenges.tsx awards 400 XP,
 * which awardGemsForXP turns into 40 gems — so a single oversized request
 * fails on every flush forever and, because a failed entry blocks the queue,
 * wedges every later mint behind it. Splitting into <=MINT_MAX chunks at
 * enqueue time keeps the awarded total intact (no clamping, no lost gems)
 * while every request stays inside the RPC's contract. The daily 450-gem cap
 * still applies server-side and is unaffected: it counts minted gems, not
 * requests.
 */

import { supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { mint, makeIdempotencyKey } from './shopService';
import { ShopError } from '../../types/shop';
import type { ShopErrorCode } from '../../types/shop';

export interface PendingMint {
  key: string;
  amount: number;
  occurredAt: string;
}

const MAX_QUEUE = 500; // generous bound; a real user mints at most a few times/session

/** Upper bound on mint_gems' p_amount — must match the RPC's own 1..20 check. */
export const MINT_MAX = 20;

function getQueue(): PendingMint[] {
  return storageGet<PendingMint[]>(STORAGE_KEYS.pendingMintQueue, []);
}

function setQueue(queue: PendingMint[]): void {
  storageSet(STORAGE_KEYS.pendingMintQueue, queue.slice(-MAX_QUEUE));
}

/** `amount` as MINT_MAX-sized requests, each with its own idempotency key. */
function asRequests(amount: number, occurredAt: string): PendingMint[] {
  const whole = Math.floor(amount);
  if (!Number.isFinite(whole) || whole < 1) return [];

  const requests: PendingMint[] = [];
  for (let left = whole; left > 0; left -= MINT_MAX) {
    requests.push({ key: makeIdempotencyKey(), amount: Math.min(left, MINT_MAX), occurredAt });
  }
  return requests;
}

/**
 * Appends a mint request to the local queue synchronously, before any network
 * attempt. An award larger than MINT_MAX is split across several requests
 * rather than clamped — mint_gems would reject the oversized one outright.
 * Returns every request enqueued, in order.
 */
export function enqueueMint(amount: number, occurredAt: string = new Date().toISOString()): PendingMint[] {
  const requests = asRequests(amount, occurredAt);
  if (requests.length > 0) setQueue([...getQueue(), ...requests]);
  return requests;
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
  // A repair that keeps producing the same rejection would spin forever, so
  // bound the total across one flush; anything past it falls through to the
  // ordinary "leave it queued and warn" path.
  let repairsLeft = queue.length + 8;

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
      if (err instanceof ShopError && repairsLeft > 0 && repairRequest(remaining, request, err.code)) {
        repairsLeft--;
        // Rewritten in place into something the RPC can accept; retry it now
        // rather than waiting for the next flush.
        setQueue(remaining);
        continue;
      }
      console.warn('[mintQueue] flush failed, will retry later:', err);
      break;
    }
  }

  return lastBalance;
}

/**
 * Heals a queued request the RPC rejects for a reason that retrying alone can
 * never fix — without these, one bad entry blocks every mint behind it forever
 * (the queue is strictly ordered and a failure breaks the loop).
 *
 * Both cases are repairs, not clamps: the gems were genuinely earned, so the
 * amount is re-split rather than discarded and a drifted timestamp is pulled
 * back into range rather than dropped. Entries predate the enqueue-time split
 * (an oversized amount) or simply sat in the queue past mint_gems' 30-day
 * occurred_at window while the user was offline or signed out.
 *
 * Mutates `queue` in place at index 0 and returns whether it changed anything.
 */
function repairRequest(queue: PendingMint[], request: PendingMint, code: ShopErrorCode): boolean {
  if (code === 'invalid_amount') {
    // Only over-the-bound is repairable; under 1 means the entry was bad when
    // written and re-splitting it would produce nothing to mint.
    if (request.amount <= MINT_MAX) return false;
    queue.splice(0, 1, ...asRequests(request.amount, request.occurredAt));
    return true;
  }

  if (code === 'invalid_occurred_at') {
    queue.splice(0, 1, ...asRequests(request.amount, new Date().toISOString()));
    return true;
  }

  return false;
}

export function getPendingMintCount(): number {
  return getQueue().length;
}
