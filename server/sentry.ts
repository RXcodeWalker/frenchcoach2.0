/**
 * Sentry for the scoring service. A no-op unless SENTRY_DSN is set (local
 * dev, tests, CI). Release = RENDER_GIT_COMMIT, the commit Render deployed.
 *
 * What gets reported: unhandled errors (process-level and Express's error
 * handler) and every handled 5xx path, through captureServerError with a
 * `route`/`stage` tag. Expected 4xx (401, 400, 403, 409, quota 429) never are.
 * Request bodies (whole transcripts, up to 5 MB) and auth headers are dropped
 * before sending — size and security, see sentryFilters.ts.
 *
 * Beyond errors: traces (every request, its Express middleware, outgoing
 * Supabase / Gemini / Groq calls — needs the service started with
 * `node --import ./dist/instrument.js`, see package.json `start:server`),
 * structured logs (console.warn/error plus `Sentry.logger`), and metrics for
 * the scoring pipeline (`recordScoringOutcome`). Each request runs in its own
 * Sentry scope tagged with its route, and the signed-in learner's id once
 * authenticated, so a trace, log or error can be filtered by who and what.
 */

import * as Sentry from '@sentry/node';
import type { NextFunction, Request, Response } from 'express';
import {
  parseRate,
  stripAttributeSecrets,
  stripBreadcrumbSecrets,
  stripEventSecrets,
  stripTransactionSecrets,
} from '../src/services/telemetry/sentryFilters';

type Env = Record<string, string | undefined>;


export function serverSentryOptions(env: Env): Sentry.NodeOptions {
  return {
    dsn: env.SENTRY_DSN,
    release: env.RENDER_GIT_COMMIT || env.SENTRY_RELEASE || undefined,
    environment: env.SENTRY_ENVIRONMENT || (env.RENDER ? 'production' : 'development'),
    sampleRate: 1.0,
    // Every request is traced for the school trial (tracing needs the
    // `--import` start; without it only the explicit spans below are recorded).
    tracesSampleRate: parseRate(env.SENTRY_TRACES_SAMPLE_RATE, 1),
    enableLogs: true,
    enableMetrics: true,
    attachStacktrace: true,
    maxBreadcrumbs: 200,
    normalizeDepth: 6,
    // The service answers about learners it identifies itself (setUser by id), so
    // nothing is collected automatically: no IP, cookies, HTTP bodies (whole
    // transcripts) or stack-frame variables (they hold auth headers and keys).
    dataCollection: { userInfo: false, cookies: false, httpBodies: [], stackFrameVariables: false },
    integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],
    beforeSend(event) {
      if (event.request) delete event.request.data;
      return stripEventSecrets(event);
    },
    beforeSendTransaction(event) {
      if (event.request) delete event.request.data;
      return stripTransactionSecrets(event);
    },
    beforeSendLog: (log) => stripAttributeSecrets(log),
    beforeSendMetric: (metric) => stripAttributeSecrets(metric),
    beforeBreadcrumb: (crumb) => stripBreadcrumbSecrets(crumb),
  };
}

/** Called once, before anything else in server/index.ts. Returns whether Sentry is on. */
export function initServerSentry(env: Env = process.env): boolean {
  if (!env.SENTRY_DSN) return false;
  // Started with `--import ./dist/instrument.js` the SDK is already up (and has
  // hooked Express and fetch); server/index.ts's own import of ./instrument
  // then arrives second and must not initialise it again.
  if (Sentry.isInitialized()) return true;
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

/**
 * Express middleware: tags the request's Sentry scope with the route it hit, so
 * its errors, logs and trace can be filtered by route. Mount before the routes.
 *
 * Under `--import` the HTTP instrumentation has already given this request its
 * own scope (and an active server span), which is the one the finished
 * transaction reads — tag that one. Without it (tests, a plain `node`), the
 * scope would be shared by every request, so fork one for this request instead:
 * a user or tag set while handling it can never leak into another request.
 */
export function sentryRequestScope(req: Request, _res: Response, next: NextFunction): void {
  const route = `${req.method} ${req.path}`;
  if (Sentry.getActiveSpan()) {
    Sentry.getIsolationScope().setTag('route', route);
    next();
    return;
  }
  Sentry.withIsolationScope((scope) => {
    scope.setTag('route', route);
    next();
  });
}

/** The signed-in learner this request belongs to (id only), once the route has authenticated it. */
export function identifyRequestUser(userId: string): void {
  if (Sentry.isInitialized()) Sentry.setUser({ id: userId });
}

export interface ScoringOutcome {
  outcome: 'ok' | 'error';
  /** The judge that answered (e.g. gemini, groq); undefined on failure. */
  provider?: string;
  durationMs: number;
  sessionId: string;
}

/**
 * One finished /score attempt, as a log line and metrics: how long scoring took
 * and whether it worked, split by judge. Observation only — it reads nothing
 * the scorer decides and changes nothing it returns.
 */
export function recordScoringOutcome(o: ScoringOutcome): void {
  if (!Sentry.isInitialized()) return;
  const attributes = { outcome: o.outcome, provider: o.provider ?? 'none' };
  Sentry.logger[o.outcome === 'ok' ? 'info' : 'error']('scoring_attempt', {
    ...attributes,
    duration_ms: o.durationMs,
    session_id: o.sessionId,
  });
  Sentry.metrics.count('scoring.attempts', 1, { attributes });
  Sentry.metrics.distribution('scoring.duration_ms', o.durationMs, { unit: 'millisecond', attributes });
}

export { Sentry };
