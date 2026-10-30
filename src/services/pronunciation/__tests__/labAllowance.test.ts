// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: async () => 'jwt-1' }));

import { getLabAllowance } from '../labAllowance';

afterEach(() => vi.unstubAllGlobals());

describe('getLabAllowance', () => {
  it('reads GET /api/pronunciation/allowance with the bearer token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ limit: 30, used: 12, remaining: 18, resetsAt: '2026-10-30T00:00:00+00:00' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getLabAllowance()).toEqual({ limit: 30, used: 12, remaining: 18, resetsAt: '2026-10-30T00:00:00+00:00' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toMatch(/\/api\/pronunciation\/allowance$/);
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
  });

  it('is null — no counter, nothing disabled — when it cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })));
    expect(await getLabAllowance()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ nope: 1 }) })));
    expect(await getLabAllowance()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await getLabAllowance()).toBeNull();
  });
});
