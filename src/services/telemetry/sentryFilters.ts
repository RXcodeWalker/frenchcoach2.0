/**
 * Pure helpers behind the frontend's Sentry setup (telemetryService.ts). No
 * Sentry import here so they're unit-testable on their own.
 *
 * Two jobs:
 *  1. Decide what is a real failure versus an expected state. Guest limit,
 *     sign-in needed, guardian consent pending, quota 429, already_generated
 *     409, validation 422, the user cancelling and mic permission denied are
 *     product states, not bugs — they become breadcrumbs, never issues.
 *  2. Strip secrets (Authorization, cookies, tokens in URLs) from events and
 *     breadcrumbs. That's security, not privacy: a leaked bearer token lets
 *     anyone act as that user.
 */

/** Names of error classes that mean "the app is working as designed". */
const EXPECTED_ERROR_NAMES = new Set([
  'AuthRequiredError', // signed out / guest limit / session expired → sign-in prompt
  'ConsentRequiredError', // under-13 account waiting for a guardian
  'ExaminerQuotaExceededError', // daily AI allowance used up
  'LabAllowanceError', // the Pronunciation Lab's daily checks used up
  'AbortError', // the user (or a newer request) cancelled; our timeouts are rethrown as other errors
  'NotAllowedError', // mic permission denied
  'PermissionDeniedError', // older browsers' name for the same
  'SecurityError', // mic blocked by an insecure context / browser policy
  'NotFoundError', // no microphone plugged in
  'AudioTooShortError', // nothing worth assessing was recorded
  'AudioTooLongError',
]);

/** HTTP statuses the backends use for expected states (see CLAUDE.md "Known Traps"). */
const EXPECTED_STATUSES = new Set([401, 403, 409, 422, 429]);

/** The HTTP status an error carries, from a `status`/`statusCode` field or an "API /x → 429" message. */
export function errorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as { status?: unknown; statusCode?: unknown; message?: unknown };
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
    if (typeof e.message === 'string') {
      const m = /→\s*(\d{3})\b/.exec(e.message);
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

export function isExpectedFailure(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const name = (err as { name?: unknown }).name;
    if (typeof name === 'string' && EXPECTED_ERROR_NAMES.has(name)) return true;
  }
  const status = errorStatus(err);
  return status !== undefined && EXPECTED_STATUSES.has(status);
}

/** A fetch that never reached the server ("Failed to fetch", Safari's "Load failed", Firefox's NetworkError). */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  return /failed to fetch|load failed|networkerror|network request failed/i.test(err.message);
}

/**
 * Supabase returns `{ message, code, details }` objects, not Errors. Sentry
 * would file those as "Object captured as exception with keys …" with no
 * useful title, so wrap them in a real Error that keeps the message.
 */
export function toReportableError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    const e = new Error((err as { message: string }).message);
    const code = (err as { code?: unknown }).code;
    e.name = typeof code === 'string' && code ? `SupabaseError(${code})` : 'SupabaseError';
    return e;
  }
  return new Error(typeof err === 'string' ? err : `Non-error thrown: ${String(err)}`);
}

/** Browser noise that is never our bug. */
export const IGNORE_ERRORS: (string | RegExp)[] = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Non-Error promise rejection captured',
  /^AbortError\b/,
  'The operation was aborted',
  'The user aborted a request',
  'signal is aborted without reason',
  // Safari/Chrome when a navigation interrupts an in-flight fetch.
  /^TypeError: (cancelled|annulé)$/,
  // Stale tab after a deploy: the old chunk names are gone. The reload fixes it.
  /Failed to fetch dynamically imported module/,
  /Importing a module script failed/,
  /error loading dynamically imported module/,
];

/** Errors whose top frame is a browser extension or injected script. */
export const DENY_URLS: RegExp[] = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-(web-)?extension:\/\//i,
  /^webkit-masked-url:\/\//i,
  /extensions\//i,
  /googletagmanager\.com/i,
];

/** production / preview / development, from Vercel's VERCEL_ENV with the Vite mode as fallback. */
export function resolveSentryEnvironment(vercelEnv: string | undefined, viteMode: string): string {
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') return vercelEnv;
  return viteMode === 'production' ? 'production' : 'development';
}

const SECRET_HEADER = /^(authorization|cookie|set-cookie|x-api-key|apikey|x-supabase-auth)$/i;
const SECRET_QUERY = /([?&#](?:access_token|refresh_token|token|apikey|api_key|code|key)=)[^&#\s]*/gi;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/g;
// A bare fragment that is itself a token (the parent view's `/parent#<token>`,
// security review F13). Short fragments ("#top", "error #42") are left alone.
const BARE_FRAGMENT = /#[^\s#=&"'<>]{16,}(?=$|[\s"'<>])/g;
// A class join code is the credential for joining a class (`/join/AB12CD`): it
// is a path segment, so the query/fragment rules above never see it.
// (A `:id` placeholder is a route name, not a code. The app also redirects a
// signed-out visitor to `/onboarding?returnTo=%2Fjoin%2FAB12CD`, so the
// URL-encoded form is covered as well.)
const JOIN_CODE_PATH = /(\/join\/)(?!:)[^/?#\s"'<>]+/gi;
const JOIN_CODE_ENCODED = /(%2Fjoin%2F)[^%/?#&\s"'<>]+/gi;
// `token=…` in free text (a console message, a log line), not only in a URL.
const BARE_SECRET_PAIR = /\b((?:access_token|refresh_token|id_token|api_key|apikey|token|password|secret)=)[^&\s"'<>]+/gi;

export function redactUrl(url: string): string {
  return url
    .replace(SECRET_QUERY, '$1[Filtered]')
    .replace(BARE_FRAGMENT, '#[Filtered]')
    .replace(JOIN_CODE_PATH, '$1[Filtered]')
    .replace(JOIN_CODE_ENCODED, '$1[Filtered]');
}

function redactString(value: string): string {
  return redactUrl(value).replace(BEARER, 'Bearer [Filtered]').replace(BARE_SECRET_PAIR, '$1[Filtered]');
}

function redactHeaders(headers: unknown): void {
  if (!headers || typeof headers !== 'object') return;
  for (const key of Object.keys(headers)) {
    if (SECRET_HEADER.test(key)) (headers as Record<string, unknown>)[key] = '[Filtered]';
  }
}

/** Structural subset of a Sentry event that carries secrets. */
interface EventLike {
  request?: { url?: string; headers?: unknown; cookies?: unknown; query_string?: unknown };
  breadcrumbs?: BreadcrumbLike[];
  exception?: { values?: { value?: string }[] };
  message?: string;
  extra?: Record<string, unknown>;
}

function redactStringValues(record: Record<string, unknown> | undefined): void {
  if (!record) return;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') record[key] = redactString(value);
  }
}

interface BreadcrumbLike {
  message?: string;
  data?: Record<string, unknown>;
}

/** Strings anywhere in a (bounded-depth) value, scrubbed; objects are copied, never mutated. */
function redactDeep(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = SECRET_HEADER.test(k) ? '[Filtered]' : redactDeep(v, depth + 1);
  return out;
}

/** Removes auth headers, cookies and tokens in URLs from a breadcrumb, in place. */
export function stripBreadcrumbSecrets<B extends BreadcrumbLike>(crumb: B): B {
  if (typeof crumb.message === 'string') crumb.message = redactString(crumb.message);
  const data = crumb.data;
  if (data) {
    for (const key of ['url', 'from', 'to']) {
      if (typeof data[key] === 'string') data[key] = redactUrl(data[key] as string);
    }
    redactHeaders(data.request_headers);
    redactHeaders(data.headers);
    // A console breadcrumb keeps the raw arguments the app logged.
    if (Array.isArray(data.arguments)) data.arguments = redactDeep(data.arguments);
  }
  return crumb;
}

/** Removes auth headers, cookies and tokens in URLs from an event, in place. */
export function stripEventSecrets<E extends EventLike>(event: E): E {
  const req = event.request;
  if (req) {
    if (typeof req.url === 'string') req.url = redactUrl(req.url);
    redactHeaders(req.headers);
    delete req.cookies;
    if (typeof req.query_string === 'string') req.query_string = redactUrl(`?${req.query_string}`).slice(1);
  }
  for (const value of event.exception?.values ?? []) {
    if (typeof value.value === 'string') value.value = redactString(value.value);
  }
  if (typeof event.message === 'string') event.message = redactString(event.message);
  redactStringValues(event.extra);
  event.breadcrumbs?.forEach(stripBreadcrumbSecrets);
  return event;
}

interface SpanLike {
  description?: string;
  data?: Record<string, unknown>;
}

interface TransactionLike extends EventLike {
  transaction?: string;
  spans?: SpanLike[];
  contexts?: { trace?: { data?: Record<string, unknown> } } & Record<string, unknown>;
}

/**
 * The same redaction for a performance transaction (page loads, navigations,
 * fetch spans), which skip `beforeSend` — security review F13.
 */
export function stripTransactionSecrets<T extends TransactionLike>(event: T): T {
  stripEventSecrets(event);
  if (typeof event.transaction === 'string') event.transaction = redactUrl(event.transaction);
  for (const span of event.spans ?? []) {
    if (typeof span.description === 'string') span.description = redactString(span.description);
    redactStringValues(span.data);
  }
  redactStringValues(event.contexts?.trace?.data);
  return event;
}

// ── Session Replay ───────────────────────────────────────────────────────────
// A replay records every URL the learner visits (page meta, navigation
// breadcrumbs, network spans) and reports them in its summary too, none of
// which pass through beforeSend. Same redaction, applied by hand.

/** rrweb event types that carry URLs: 4 = page meta (`data.href`), 5 = custom (breadcrumbs, network and navigation spans). */
const REPLAY_META_EVENT = 4;
const REPLAY_CUSTOM_EVENT = 5;
/** Keys whose string values are URLs or URL-bearing text in those events. */
const REPLAY_URL_KEYS = new Set(['href', 'url', 'from', 'to', 'description', 'message']);
const REPLAY_WALK_DEPTH = 6;

function redactReplayNode(node: unknown, depth: number): void {
  if (!node || typeof node !== 'object' || depth > REPLAY_WALK_DEPTH) return;
  if (Array.isArray(node)) {
    for (const item of node) redactReplayNode(item, depth + 1);
    return;
  }
  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (typeof value === 'string') {
      if (REPLAY_URL_KEYS.has(key)) record[key] = redactString(value);
    } else {
      redactReplayNode(value, depth + 1);
    }
  }
}

/**
 * `beforeAddRecordingEvent` for the replay integration: scrubs tokens and join
 * codes from the URLs in page-meta and breadcrumb/network events, in place.
 * Full DOM snapshots are left alone (walking them on every mutation is costly;
 * text in them is masked by the replay's own settings).
 */
export function redactRecordingEvent<E extends { type?: number }>(event: E): E {
  if (event.type === REPLAY_META_EVENT || event.type === REPLAY_CUSTOM_EVENT) redactReplayNode(event, 0);
  return event;
}

/** The replay's own summary event lists the pages it covered; redact those too. */
export function stripReplaySummarySecrets<E extends { type?: string; urls?: string[]; request?: { url?: string } }>(event: E): E {
  if (event.type !== 'replay_event') return event;
  if (Array.isArray(event.urls)) event.urls = event.urls.map((u) => (typeof u === 'string' ? redactUrl(u) : u));
  if (typeof event.request?.url === 'string') event.request.url = redactUrl(event.request.url);
  return event;
}

/** A Sentry log or metric's string attributes and message, scrubbed the same way. */
export function stripAttributeSecrets<T extends { message?: unknown; attributes?: Record<string, unknown> }>(item: T): T {
  if (typeof item.message === 'string') item.message = redactString(item.message);
  const attrs = item.attributes;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === 'string') {
        attrs[key] = redactString(value);
      } else if (value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'string') {
        // Sentry's typed attribute form: { value, type }.
        (value as { value: string }).value = redactString((value as { value: string }).value);
      }
    }
  }
  return item;
}

// ── Sampling ─────────────────────────────────────────────────────────────────

/** A sample rate from an env string: a number in 0..1, else the fallback. */
export function parseRate(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/**
 * Sampling for the school trial: everything on, because the trial is small and
 * the point is to see all of it. Profiling is the exception — it runs on the
 * learner's own phone and costs CPU, so it is a sample. Every rate can be
 * changed at build time without a code change (VITE_SENTRY_*), and should be
 * lowered, not removed, when real traffic arrives.
 */
export interface SentrySampleRates {
  traces: number;
  replaySession: number;
  replayOnError: number;
  profileSession: number;
}

export const TRIAL_SAMPLE_RATES: SentrySampleRates = {
  traces: 1,
  replaySession: 1,
  replayOnError: 1,
  profileSession: 0.5,
};

export function resolveSampleRates(env: Record<string, string | undefined>): SentrySampleRates {
  return {
    traces: parseRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE, TRIAL_SAMPLE_RATES.traces),
    replaySession: parseRate(env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE, TRIAL_SAMPLE_RATES.replaySession),
    replayOnError: parseRate(env.VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE, TRIAL_SAMPLE_RATES.replayOnError),
    profileSession: parseRate(env.VITE_SENTRY_PROFILE_SAMPLE_RATE, TRIAL_SAMPLE_RATES.profileSession),
  };
}

// ── Trace propagation ────────────────────────────────────────────────────────

const escapeRegExp = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where the browser may attach `sentry-trace`/`baggage` headers: our same-origin
 * API and health probe (Vercel proxies them to FastAPI), plus the scoring
 * service's origin when one is configured. Nothing third-party.
 */
export function tracePropagationTargetsFor(scoringApiUrl: string | undefined): (string | RegExp)[] {
  const targets: (string | RegExp)[] = [/^\/api\//, /^\/health/];
  if (scoringApiUrl) {
    try {
      targets.push(new RegExp(`^${escapeRegExp(new URL(scoringApiUrl).origin)}/`));
    } catch {
      // A malformed URL means the scoring client is misconfigured anyway; trace nothing extra.
    }
  }
  return targets;
}

/** Longest id kept as a Sentry tag (Sentry's own limit is 200). */
const MAX_ID_TAG = 100;
const ID_TAG = /^[A-Za-z0-9_.:-]+$/;

/**
 * An id safe to put on a Sentry tag, or undefined. Only id-shaped strings pass
 * (letters, digits, `_ . : -`): a value with spaces or other text is refused
 * rather than redacted, so a sentence can never reach Sentry through a tag.
 */
export function sentryIdTag(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  if (!id || id.length > MAX_ID_TAG || !ID_TAG.test(id)) return undefined;
  return id;
}
