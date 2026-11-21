// End-to-end proof for the scoring service: the real @sentry/node SDK with
// the service's own options, a real Express 5 app, and a recording transport
// in place of Sentry. A thrown handler error and a handled 5xx both arrive,
// tagged, with the Authorization header and the request body stripped.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Sentry, captureServerError, identifyRequestUser, initServerSentry, recordScoringOutcome, sentryRequestScope, serverSentryOptions } from '../sentry';

type Envelope = [Record<string, unknown>, [Record<string, unknown>, unknown][]];
const envelopes: Envelope[] = [];
let server: Server;
let base: string;

/** The event whose exception message is `message` (stack source context can mention other messages). */
function eventFor(message: string): Record<string, unknown> | undefined {
  return sentEvents().find((e) => (e as { exception?: { values?: { value?: string }[] } }).exception?.values?.[0]?.value === message);
}

function sentEvents(): Record<string, unknown>[] {
  return envelopes.flatMap(([, items]) =>
    items.filter(([header]) => header.type === 'event').map(([, payload]) => payload as Record<string, unknown>),
  );
}

beforeAll(async () => {
  Sentry.init({
    ...serverSentryOptions({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/0', RENDER_GIT_COMMIT: 'abc123', RENDER: 'true' }),
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope as unknown as Envelope);
        return {};
      },
      flush: async () => true,
    }),
  });

  const app = express();
  app.use(sentryRequestScope);
  app.use(express.json());
  app.post('/boom', () => {
    throw new Error('unexpected failure in handler');
  });
  app.post('/handled', (req, res) => {
    captureServerError(new Error('judge unavailable'), { route: 'POST /score', stage: 'scoring', status: 500, code: 'judge_unavailable', sessionId: 's-1', userId: 'u-1' });
    res.status(500).json({ error: 'scoring failed' });
    void req;
  });
  // Two requests in flight at once: the one that identifies its learner must not
  // lend that learner to the one that does not.
  app.post('/who', async (req, res) => {
    identifyRequestUser(String(req.headers['x-user']));
    await new Promise((r) => setTimeout(r, 40));
    Sentry.captureException(new Error('request of an identified learner'));
    res.status(200).json({});
  });
  app.post('/anon', async (_req, res) => {
    await new Promise((r) => setTimeout(r, 10));
    Sentry.captureException(new Error('request of nobody in particular'));
    res.status(200).json({});
  });
  app.post('/unauthorized', (_req, res) => {
    res.status(401).json({ error: 'unauthorized' });
  });
  Sentry.setupExpressErrorHandler(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await Sentry.close();
});

const SECRET = 'eyJhbGciOi.secret-token.sig';
const BODY = { transcript: 'Je suis allé au cinéma avec mes amis', sessionId: 's-1' };

async function post(path: string): Promise<number> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}`, Cookie: 'sb=abc' },
    body: JSON.stringify(BODY),
  });
  return res.status;
}

describe('scoring service Sentry capture', () => {
  it('captures an unhandled handler error with release/environment and no auth header or body', async () => {
    expect(await post('/boom')).toBe(500);
    await Sentry.flush(2000);
    const event = eventFor('unexpected failure in handler') as Record<string, unknown> & {
      release?: string;
      environment?: string;
      request?: { headers?: Record<string, string>; data?: unknown; cookies?: unknown };
    };
    expect(event).toBeDefined();
    console.log('[sentry node event]', JSON.stringify({ release: event.release, environment: event.environment, request: event.request, tags: event.tags }, null, 2));
    expect(event.release).toBe('abc123');
    expect(event.environment).toBe('production');
    expect(event.request?.data).toBeUndefined();
    const raw = JSON.stringify(event);
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain('cinéma');
    expect(raw).not.toContain('sb=abc');
  });

  it('captures a handled 5xx with route/stage/status/code tags', async () => {
    expect(await post('/handled')).toBe(500);
    await Sentry.flush(2000);
    const event = eventFor('judge unavailable') as { tags?: Record<string, string>; user?: { id?: string } };
    expect(event?.tags).toMatchObject({ route: 'POST /score', stage: 'scoring', status: '500', code: 'judge_unavailable' });
    expect(event?.user?.id).toBe('u-1');
  });

  it('sends nothing for an expected 401', async () => {
    const before = sentEvents().length;
    expect(await post('/unauthorized')).toBe(401);
    await Sentry.flush(2000);
    expect(sentEvents().length).toBe(before);
  });

  it('keeps a learner id and the route on their own request, never another', async () => {
    const call = (path: string, user?: string) =>
      fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { 'x-user': user } : {}) }, body: '{}' });
    await Promise.all([call('/who', 'u-7'), call('/anon')]);
    await Sentry.flush(2000);
    const who = eventFor('request of an identified learner') as { user?: { id?: string }; tags?: Record<string, string> };
    const anon = eventFor('request of nobody in particular') as { user?: { id?: string }; tags?: Record<string, string> };
    expect(who?.user?.id).toBe('u-7');
    expect(who?.tags?.route).toBe('POST /who');
    expect(anon?.user?.id).toBeUndefined();
    expect(anon?.tags?.route).toBe('POST /anon');
  });
});

describe('scoring service Sentry beyond errors', () => {
  function items(type: string): unknown[] {
    return envelopes.flatMap(([, list]) => list.filter(([h]) => h.type === type).map(([, payload]) => payload));
  }

  it('traces every request and collects logs and metrics by default, collecting nothing about the user on its own', () => {
    const o = serverSentryOptions({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/0' });
    expect(o.tracesSampleRate).toBe(1);
    expect(o.enableLogs).toBe(true);
    expect(o.enableMetrics).toBe(true);
    expect(o.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpBodies: [], stackFrameVariables: false });
    expect(serverSentryOptions({ SENTRY_DSN: 'x', SENTRY_TRACES_SAMPLE_RATE: '0.25' }).tracesSampleRate).toBe(0.25);
    expect(serverSentryOptions({ SENTRY_DSN: 'x', SENTRY_TRACES_SAMPLE_RATE: 'lots' }).tracesSampleRate).toBe(1);
  });

  it('records a finished scoring attempt as a log line and metrics, by judge', async () => {
    recordScoringOutcome({ outcome: 'ok', provider: 'gemini', durationMs: 8123, sessionId: 's-42' });
    recordScoringOutcome({ outcome: 'error', durationMs: 900, sessionId: 's-43' });
    await Sentry.flush(2000);

    const logs = items('log').flatMap((p) => (p as { items: { body: string; level: string; attributes: Record<string, { value: unknown }> }[] }).items);
    const ok = logs.find((l) => l.body === 'scoring_attempt' && l.attributes.session_id.value === 's-42');
    expect(ok).toMatchObject({ level: 'info' });
    expect(ok?.attributes.provider.value).toBe('gemini');
    const failed = logs.find((l) => l.body === 'scoring_attempt' && l.attributes.session_id.value === 's-43');
    expect(failed?.level).toBe('error');

    const metrics = items('trace_metric').flatMap((p) => (p as { items: { name: string; value: number; type: string; unit?: string; attributes: Record<string, { value: unknown }> }[] }).items);
    const duration = metrics.find((m) => m.name === 'scoring.duration_ms' && m.attributes.provider.value === 'gemini');
    expect(duration).toMatchObject({ type: 'distribution', value: 8123, unit: 'millisecond' });
    expect(metrics.filter((m) => m.name === 'scoring.attempts')).toHaveLength(2);
  });

  it('is initialised once however many times it is started', () => {
    // The SDK is already up (beforeAll): started again — as server/index.ts does after `--import` — it must not re-init.
    const client = Sentry.getClient();
    expect(initServerSentry({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/0' })).toBe(true);
    expect(Sentry.getClient()).toBe(client);
    expect(initServerSentry({})).toBe(false);
  });
});
