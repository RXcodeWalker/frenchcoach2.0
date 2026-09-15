/**
 * Single source for "the Supabase access token this browser can send to the
 * backend", plus the error every caller raises when there isn't one.
 *
 * Phase 3 made the AI endpoints (`/api/feedback/v3`, `/api/feedback/stream`,
 * `/api/pronunciation`, …) require a verified Supabase JWT server-side
 * (backend/main.py's verify_jwt). Guest mode (src/hooks/useGuestMode.ts) is
 * still a supported way into the app, and a guest has no session at all — so
 * without this, every AI call a guest makes is fired, travels to Render, and
 * comes back 401 "Missing or invalid Authorization header". Fail fast here
 * instead: no token means the request can only 401, so don't send it.
 *
 * getSession() already refreshes an *expired* token, but it hands back a token
 * that is about to expire unchanged — that one arrives at the backend dead and
 * reads as a mystery 401. Hence the near-expiry refresh below.
 */
import { supabase } from './supabase';

/** A token this close to expiry is refreshed before use rather than sent. */
const REFRESH_SKEW_SEC = 60;

/**
 * Thrown instead of firing a request that can only come back 401. `message` is
 * user-presentable — call sites surface it directly (Learn's feedback error
 * card, the pronunciation card) rather than inventing their own copy.
 */
export class AuthRequiredError extends Error {
  constructor(message = 'Sign in to use AI feedback.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export function isAuthRequiredError(err: unknown): err is AuthRequiredError {
  return err instanceof Error && err.name === 'AuthRequiredError';
}

/** The access token, or null when signed out (guest mode) or unrefreshable. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const expiresAt = session.expires_at;
  const nearExpiry =
    typeof expiresAt === 'number' && expiresAt - Date.now() / 1000 < REFRESH_SKEW_SEC;
  if (!nearExpiry) return session.access_token;

  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

/** `{ Authorization }` for a signed-in user; throws AuthRequiredError otherwise. */
export async function requireAuthHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new AuthRequiredError();
  return { Authorization: `Bearer ${token}` };
}
