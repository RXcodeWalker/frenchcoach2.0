// @vitest-environment jsdom
//
// Regression cover for the `source_not_client_submittable` retry loop:
// mystery_box XP events logged locally before the box became server-claimed
// (20260912093000) sit in users' local ledgers forever. submit_xp_event
// rejects them, nothing marks them synced, so every hydrate/backfill/flush
// re-fires them and 400s. They must be skipped, and skipped permanently.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import { pushXpEvent, backfillXpEventsToCloud, flushPendingXpEventQueue } from '../xpLedger';
import { setXpEventLog } from '../xpLedgerStorage';
import { getSyncedIds, addPendingId, getPendingIds } from '../../sync/syncQueue';
import { STORAGE_KEYS } from '../../persistence/storage';
import { SERVER_ONLY_XP_SOURCES } from '../../../types/social';
import type { XpEventRecord, XpSource } from '../../../types/social';

const USER = 'user-1';

function record(source: XpSource, id = `xp-${source}`): XpEventRecord {
  return { id, amount: 100, source, metadata: {}, occurredAt: '2026-09-01T00:00:00.000Z' };
}

beforeEach(() => {
  localStorage.clear();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
});

describe('server-only XP sources are never submitted', () => {
  it.each([...SERVER_ONLY_XP_SOURCES])('pushXpEvent does not call submit_xp_event for %s', async source => {
    const result = await pushXpEvent(USER, record(source));
    expect(rpcMock).not.toHaveBeenCalled();
    expect(result).toBe(true); // reported handled, not failed — there is nothing to retry
  });

  it('marks a skipped event synced so it is not retried on the next sync', async () => {
    await pushXpEvent(USER, record('mystery_box'));
    expect(getSyncedIds(STORAGE_KEYS.syncedXpEventIds).has('xp-mystery_box')).toBe(true);
  });

  it('still submits a client-submittable source', async () => {
    await pushXpEvent(USER, record('practice'));
    expect(rpcMock).toHaveBeenCalledWith('submit_xp_event', expect.objectContaining({ p_source: 'practice' }));
  });
});

describe('backfillXpEventsToCloud', () => {
  it('backfills only the client-submittable events in a mixed local log', async () => {
    const local = [record('practice', 'xp-a'), record('mystery_box', 'xp-b'), record('daily_challenge', 'xp-c')];
    const pushed = await backfillXpEventsToCloud(USER, local, new Set());

    expect(pushed).toBe(1);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('submit_xp_event', expect.objectContaining({ p_idempotency_key: 'xp-a' }));
  });

  it('does not re-attempt the skipped events on a second backfill', async () => {
    const local = [record('mystery_box', 'xp-b')];
    await backfillXpEventsToCloud(USER, local, new Set());
    await backfillXpEventsToCloud(USER, local, new Set());
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('flushPendingXpEventQueue', () => {
  it('drains a server-only event out of the pending queue without submitting it', async () => {
    setXpEventLog([record('mystery_box', 'xp-b')]);
    addPendingId(STORAGE_KEYS.pendingSyncXpEventIds, 'xp-b');

    await flushPendingXpEventQueue();

    expect(rpcMock).not.toHaveBeenCalled();
    expect(getPendingIds(STORAGE_KEYS.pendingSyncXpEventIds)).not.toContain('xp-b');
  });
});
