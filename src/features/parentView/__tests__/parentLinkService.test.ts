import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../../../lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) }, supabaseConfigured: true }));

import { buildParentLink, createParentLink, fetchParentReport, ParentLinkError, tokenFromHash } from '../parentLinkService';

const TOKEN = 'a'.repeat(64);

beforeEach(() => rpc.mockReset());

describe('parent link tokens', () => {
  it('puts the token in the hash, never the path or query (so it never reaches a server log)', () => {
    const url = buildParentLink(TOKEN, 'https://example.test');
    expect(url).toBe(`https://example.test/parent#${TOKEN}`);
    expect(new URL(url).search).toBe('');
  });

  it('reads only a 64-hex token from the hash', () => {
    expect(tokenFromHash(`#${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash(`#${TOKEN.toUpperCase()}`)).toBe(TOKEN);
    expect(tokenFromHash('#abc')).toBeNull();
    expect(tokenFromHash('')).toBeNull();
  });
});

describe('RPC error mapping', () => {
  it('maps a revoked/unknown link to invalid_link', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_link' } });
    await expect(fetchParentReport(TOKEN)).rejects.toMatchObject({ code: 'invalid_link' });
  });

  it('maps a missing function (migration not applied) to not_available', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.create_parent_link' } });
    await expect(createParentLink('Mum')).rejects.toBeInstanceOf(ParentLinkError);
    await expect(createParentLink('Mum')).rejects.toMatchObject({ code: 'not_available' });
  });

  it('trims the label and sends it as p_label', async () => {
    rpc.mockResolvedValue({ data: { id: 'x', token: TOKEN, label: 'Mum', createdAt: '2026-11-04T00:00:00Z' }, error: null });
    const link = await createParentLink('  Mum  ');
    expect(rpc).toHaveBeenCalledWith('create_parent_link', { p_label: 'Mum' });
    expect(link).toMatchObject({ token: TOKEN, viewCount: 0, lastViewedAt: null });
  });
});
