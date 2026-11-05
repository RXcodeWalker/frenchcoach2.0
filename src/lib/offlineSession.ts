import type { User } from '@supabase/supabase-js';

/**
 * Offline support: the signed-in user as last stored by supabase-js.
 *
 * Opened offline after the access token has expired (it lasts an hour),
 * supabase-js can't refresh it and reports "no session" — but it keeps the
 * stored session, because a network failure is retryable. Without this the
 * learner would land on the sign-in screen with no connection to sign in
 * with, and lose their own account's progress on this device until then.
 *
 * Only the user object is read (for the account scope and the profile name);
 * no token is used from here. supabase-js refreshes the session itself once
 * the connection is back (`TOKEN_REFRESHED`), and a session the server
 * rejects is removed from storage, so this returns null after that.
 */
export function storedSessionUser(storage: Pick<Storage, 'length' | 'key' | 'getItem'> | null = safeLocalStorage()): User | null {
  if (!storage) return null;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? 'null') as { user?: User; refresh_token?: string } | null;
      if (parsed?.refresh_token && parsed.user && typeof parsed.user.id === 'string') return parsed.user;
    } catch {
      // Not a session we can read: treat as signed out.
    }
  }
  return null;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
