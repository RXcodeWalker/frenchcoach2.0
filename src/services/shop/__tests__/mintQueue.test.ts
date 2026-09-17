// @vitest-environment jsdom
//
// Regression cover for the mint_gems `invalid_amount` wedge: a single award
// bigger than the RPC's 1..20 bound (Challenges.tsx awards 400 XP -> 40 gems)
// used to be enqueued whole, rejected on every flush, and — because a failed
// entry breaks the flush loop — block every later mint behind it forever.
import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueMint, getPendingMintCount, MINT_MAX } from '../mintQueue';
import { STORAGE_KEYS, storageGet } from '../../persistence/storage';
import type { PendingMint } from '../mintQueue';

const queue = () => storageGet<PendingMint[]>(STORAGE_KEYS.pendingMintQueue, []);

beforeEach(() => {
  localStorage.clear();
});

describe('enqueueMint', () => {
  it('enqueues an ordinary award as a single request', () => {
    const requests = enqueueMint(8);
    expect(requests).toHaveLength(1);
    expect(requests[0].amount).toBe(8);
    expect(getPendingMintCount()).toBe(1);
  });

  it('splits an award over the RPC bound instead of enqueueing one oversized request', () => {
    const requests = enqueueMint(40);
    expect(requests.map(r => r.amount)).toEqual([MINT_MAX, MINT_MAX]);
    expect(queue().every(r => r.amount >= 1 && r.amount <= MINT_MAX)).toBe(true);
  });

  it('preserves the awarded total exactly — splitting, never clamping', () => {
    const total = 97;
    const requests = enqueueMint(total);
    expect(requests.reduce((sum, r) => sum + r.amount, 0)).toBe(total);
  });

  it('gives every chunk its own idempotency key so one is never a replay of another', () => {
    const keys = enqueueMint(60).map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('shares the award timestamp across chunks, keeping them on one daily-cap day', () => {
    const occurredAt = '2026-09-17T10:00:00.000Z';
    expect(enqueueMint(45, occurredAt).every(r => r.occurredAt === occurredAt)).toBe(true);
  });

  it('enqueues nothing for a non-positive award rather than a request the RPC must reject', () => {
    expect(enqueueMint(0)).toEqual([]);
    expect(enqueueMint(-5)).toEqual([]);
    expect(getPendingMintCount()).toBe(0);
  });

  it('appends to an existing queue instead of replacing it', () => {
    enqueueMint(5);
    enqueueMint(30);
    expect(getPendingMintCount()).toBe(3); // 5, then 20 + 10
  });
});
