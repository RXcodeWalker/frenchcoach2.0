import { describe, expect, it } from 'vitest';
import { storedSessionUser } from '../offlineSession';

function storage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => entries[k] ?? null };
}

describe('storedSessionUser (opening the app offline)', () => {
  it('returns the stored user while supabase-js still holds a session', () => {
    const s = storage({
      theme: 'dark',
      'sb-abcd-auth-token': JSON.stringify({ access_token: 'x', refresh_token: 'r', user: { id: 'user-1', email: 'a@b.c' } }),
    });
    expect(storedSessionUser(s)?.id).toBe('user-1');
  });

  it('returns null with no stored session, a session without a refresh token, or unreadable data', () => {
    expect(storedSessionUser(storage({}))).toBeNull();
    expect(storedSessionUser(storage({ 'sb-abcd-auth-token': JSON.stringify({ user: { id: 'u' } }) }))).toBeNull();
    expect(storedSessionUser(storage({ 'sb-abcd-auth-token': '{not json' }))).toBeNull();
    expect(storedSessionUser(storage({ 'sb-abcd-auth-token-code-verifier': '"v"' }))).toBeNull();
    expect(storedSessionUser(null)).toBeNull();
  });
});
