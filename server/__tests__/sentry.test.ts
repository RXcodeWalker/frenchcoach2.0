// End-to-end proof for the scoring service: the real @sentry/node SDK with
// the service's own options, a real Express 5 app, and a recording transport
// in place of Sentry. A thrown handler error and a handled 5xx both arrive,
// tagged, with the Authorization header and the request body stripped.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Sentry, captureServerError, serverSentryOptions } from '../sentry';

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
  app.use(express.json());
  app.post('/boom', () => {
    throw new Error('unexpected failure in handler');
  });
  app.post('/handled', (req, res) => {
    captureServerError(new Error('judge unavailable'), { route: 'POST /score', stage: 'scoring', status: 500, code: 'judge_unavailable', sessionId: 's-1', userId: 'u-1' });
    res.status(500).json({ error: 'scoring failed' });
    void req;
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
});
