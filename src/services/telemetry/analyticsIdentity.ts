/**
 * Sign-in / sign-up / sign-out as analytics: PostHog is told the Supabase user
 * id (never an email or name) on the transition, and reset on sign-out.
 * Driven by AnalyticsTracker from the auth state.
 */
import type { User } from '@supabase/supabase-js';
import { track, type AuthMethod } from './telemetryService';
import { identifyAnalyticsUser, resetAnalyticsUser } from './posthogClient';
import { getIdentifiedUserId, setIdentifiedUserId } from './analyticsState';

/** A sign-in or account creation this recent is reported as having just happened. */
const FRESH_AUTH_MS = 10 * 60 * 1000;

function isRecent(iso: string | undefined, now: number): boolean {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) && now - t < FRESH_AUTH_MS;
}

export function authMethodOf(user: User): AuthMethod {
  const provider = (user.app_metadata as { provider?: string } | undefined)?.provider;
  return provider === 'email' || provider === 'google' || provider === 'azure' ? provider : 'other';
}

/**
 * The identity transition for this auth state, as an event to report:
 * a new user id → signed_up (account created in the last few minutes) or
 * signed_in (this page load signed in, or the session is a fresh one); no user
 * where PostHog had one → signed_out. A session restored from storage for the
 * user PostHog already knows is not an event. Exported for tests.
 */
export function syncAnalyticsIdentity(user: User | null, initialLoad: boolean, now: number = Date.now()): void {
  const known = getIdentifiedUserId();
  if (user) {
    if (user.id === known) return;
    identifyAnalyticsUser(user.id);
    setIdentifiedUserId(user.id);
    const method = authMethodOf(user);
    if (isRecent(user.created_at, now)) track({ name: 'signed_up', props: { method } });
    else if (!initialLoad || isRecent(user.last_sign_in_at, now)) track({ name: 'signed_in', props: { method } });
    return;
  }
  if (known) {
    track({ name: 'signed_out', props: {} });
    resetAnalyticsUser();
    setIdentifiedUserId(null);
  }
}
