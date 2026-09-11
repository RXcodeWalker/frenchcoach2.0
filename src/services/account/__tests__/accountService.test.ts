// @vitest-environment jsdom
// Phase 1.6 Part B — accountService RPC wrappers + local export merge.
// Mocks the Supabase client boundary and analyticsService's local export,
// per dailyChallengeService.test.ts's precedent.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

vi.mock('../../analytics/analyticsService', () => ({
  exportData: () => JSON.stringify({ sessions: [] }),
}));

vi.mock('../../persistence/storage', () => ({
  getStorageScope: () => null,
}));

import { exportMyData, deleteMyAccount, AccountError } from '../accountService';

beforeEach(() => {
  rpcMock.mockReset();
  // jsdom doesn't implement these — stub so exportMyData's download step doesn't throw.
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
});

describe('exportMyData', () => {
  it('merges the cloud RPC payload with the local analytics export', async () => {
    rpcMock.mockResolvedValueOnce({ data: { profile: { id: 'u1' } }, error: null });
    const result = await exportMyData();
    expect(rpcMock).toHaveBeenCalledWith('export_my_data');
    expect(result.cloud).toEqual({ profile: { id: 'u1' } });
    expect(result.localAnalytics).toEqual({ sessions: [] });
    expect(result.exportedAt).toBeTruthy();
  });

  it('maps not_authenticated to a typed AccountError', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not_authenticated' } });
    await expect(exportMyData()).rejects.toMatchObject({
      name: 'AccountError',
      code: 'not_authenticated',
    });
  });
});

describe('deleteMyAccount', () => {
  it('calls delete_my_account and resolves on success', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(deleteMyAccount()).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('delete_my_account');
  });

  it('maps an RPC error to a typed AccountError', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not_authenticated' } });
    const err = await deleteMyAccount().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccountError);
    expect((err as AccountError).code).toBe('not_authenticated');
  });
});
