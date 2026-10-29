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

export function redactUrl(url: string): string {
  return url.replace(SECRET_QUERY, '$1[Filtered]');
}

function redactString(value: string): string {
  return redactUrl(value).replace(BEARER, 'Bearer [Filtered]');
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
