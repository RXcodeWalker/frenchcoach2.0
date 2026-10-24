/**
 * Sentry for the scoring service. A no-op unless SENTRY_DSN is set (local
 * dev, tests, CI). Release = RENDER_GIT_COMMIT, the commit Render deployed.
 * Errors only — see the tracing note below for why there are no traces.
 *
 * What gets reported: unhandled errors (process-level and Express's error
 * handler) and every handled 5xx path, through captureServerError with a
 * `route`/`stage` tag. Expected 4xx (401, 400, 403, 409, quota 429) never are.
 * Request bodies (whole transcripts, up to 5 MB) and auth headers are dropped
 * before sending — size and security, see sentryFilters.ts.
 */

import * as Sentry from '@sentry/node';
import { stripBreadcrumbSecrets, stripEventSecrets } from '../src/services/telemetry/sentryFilters';

type Env = Record<string, string | undefined>;


export function serverSentryOptions(env: Env): Sentry.NodeOptions {
  return {
    dsn: env.SENTRY_DSN,
    release: env.RENDER_GIT_COMMIT || env.SENTRY_RELEASE || undefined,
    environment: env.SENTRY_ENVIRONMENT || (env.RENDER ? 'production' : 'development'),
    sendDefaultPii: false,
    // Every error; no traces, no profiling. The esbuild bundle is ESM and is
    // started as plain `node dist/server.js`, so Sentry can't auto-instrument
    // Express/HTTP (that needs `node --import`) — traces would be empty. Error
    // capture doesn't depend on it. Turning traces on means changing
    // start:server to `node --import` a separately bundled instrument file.
    // tracesSampleRate is deliberately left unset (not 0): unset is what turns
    // tracing off entirely.
    sampleRate: 1.0,
    beforeSend(event) {
      if (event.request) delete event.request.data;
      return stripEventSecrets(event);
    },
    beforeBreadcrumb: (crumb) => stripBreadcrumbSecrets(crumb),
  };
}

/** Called once, before anything else in server/index.ts. Returns whether Sentry is on. */
export function initServerSentry(env: Env = process.env): boolean {
  if (!env.SENTRY_DSN) return false;
  Sentry.init(serverSentryOptions(env));
  // Set SENTRY_TEST_EVENT=1 on Render to confirm the wiring (one event per
  // boot), then remove it.
  if (env.SENTRY_TEST_EVENT === '1') {
    Sentry.captureMessage('Sentry test event from the scoring service (SENTRY_TEST_EVENT=1)', 'error');
  }
  return true;
}

export interface ServerErrorContext {
  route: string;
  stage: string;
  /** The status the client got. */
  status?: number;
  /** e.g. the scoringFailure.ts code. */
  code?: string;
  sessionId?: string;
  userId?: string;
}

/** Reports a handled failure that is answering 5xx (or silently losing work). */
export function captureServerError(err: unknown, ctx: ServerErrorContext): void {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    scope.setTag('route', ctx.route);
    scope.setTag('stage', ctx.stage);
    if (ctx.status !== undefined) scope.setTag('status', String(ctx.status));
    if (ctx.code) scope.setTag('code', ctx.code);
    if (ctx.sessionId) scope.setExtra('sessionId', ctx.sessionId);
    if (ctx.userId) scope.setUser({ id: ctx.userId });
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}

export { Sentry };
