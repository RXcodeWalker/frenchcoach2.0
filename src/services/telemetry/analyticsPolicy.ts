/**
 * Who and where PostHog may watch *behaviour* (session replay, autocapture,
 * heatmaps, rage/dead clicks). Pure — no SDK, no React — so the rules are
 * unit-tested and one table says them.
 *
 * Named events (`track()`) are not governed here: they are allow-listed ids,
 * enums and counts and always flow. This only decides the broader, "watch what
 * they did" capture added for the school trial:
 *
 *   - 'full'        — replay (all text and inputs masked), autocapture of
 *                     clicks, heatmaps, rage and dead clicks.
 *   - 'events_only' — named events and page views only; nothing is recorded.
 *
 * Fail closed: a signed-in account is 'events_only' until its age band and
 * guardian-consent status are *known*, an under-13 or consent-pending account
 * never leaves it, and the Junior track (Grades 4-7) never leaves it — its
 * screens track nothing by design (junior-track §N).
 */
import type { AgeBand, ConsentStatus } from '../../context/AuthContext';

export type CaptureLevel = 'full' | 'events_only';

export interface CaptureLevelInput {
  signedIn: boolean;
  ageBand: AgeBand;
  consentStatus: ConsentStatus;
  /** AppState.learnerTrack ('exam' | 'junior'). */
  learnerTrack: string;
}

export function captureLevelFor(input: CaptureLevelInput): CaptureLevel {
  if (input.learnerTrack === 'junior') return 'events_only';
  if (!input.signedIn) return 'full'; // a guest: no account, no age band to read
  if (input.ageBand === null || input.ageBand === 'under_13') return 'events_only';
  if (input.consentStatus === 'unknown' || input.consentStatus === 'pending' || input.consentStatus === 'revoked') return 'events_only';
  return 'full';
}

/**
 * Screens where nothing but the page view is captured, even at 'full': sign-in
 * and password flows, guardian consent and the age check, the teacher area
 * (it lists other people's children), the parent view, admin, Junior, and
 * pages whose URL itself is a secret (/join/<code>, /unsubscribe).
 */
export const NO_BEHAVIOUR_PREFIXES = [
  '/login',
  '/auth',
  '/reset-password',
  '/guardian-consent',
  '/age-band',
  '/invite-code',
  '/parent',
  '/teach',
  '/admin',
  '/debug',
  '/junior',
  '/join',
  '/unsubscribe',
] as const;

export function isNoBehaviourRoute(pathname: string): boolean {
  return NO_BEHAVIOUR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Whether behaviour capture is allowed right now: the account's level AND the screen. */
export function behaviourCaptureAllowed(level: CaptureLevel, pathname: string): boolean {
  return level === 'full' && !isNoBehaviourRoute(pathname);
}

/**
 * Regex *strings* for the SDK's `autocapture.url_ignorelist` (it compiles them
 * with `new RegExp`), matched against the full URL — the same screens as
 * `isNoBehaviourRoute`, so the SDK itself also skips them.
 */
export const AUTOCAPTURE_URL_IGNORELIST: string[] = NO_BEHAVIOUR_PREFIXES.map((p) => `^https?://[^/]+${p}(/|\\?|#|$)`);

/** The events the behaviour gate drops when behaviour capture is not allowed. */
const BEHAVIOUR_EVENTS: ReadonlySet<string> = new Set(['$autocapture', '$rageclick', '$dead_click', '$heatmap', '$$heatmap']);

export function isBehaviourEvent(eventName: string | undefined): boolean {
  return !!eventName && BEHAVIOUR_EVENTS.has(eventName);
}

/**
 * The feature a screen belongs to — its first path segment ('/learn/sounds' →
 * 'learn', '/rapid-fire' → 'rapid-fire', '/' → 'home'). Registered with every
 * event so "which parts of the app get used" is one breakdown, including the
 * games whose own code is forbidden from analytics (their isolation tests).
 * Ids never appear: only the first segment is kept, capped to 32 characters.
 */
export function featureOf(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0];
  if (!first) return 'home';
  return first.slice(0, 32);
}

/**
 * A URL path with secrets that live in the path itself removed: a class join
 * code (`/join/ABC123` lets anyone into the class). Query and hash are already
 * dropped by `sanitizeUrl`.
 */
export function redactSecretPath(pathname: string): string {
  return pathname.replace(/^\/join\/[^/]+/i, '/join/:code');
}
