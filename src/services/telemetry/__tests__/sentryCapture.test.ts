// @vitest-environment jsdom
// End-to-end proof for the frontend: the real @sentry/react SDK, initialised
// with the app's own options, sends what captureError reports (tagged) and
// nothing for expected states. A recording transport stands in for Sentry.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/react';
import { captureError, sentryBrowserOptions, tagSentryIds } from '../telemetryService';
import { AuthRequiredError } from '../../../lib/authToken';
import { ApiHttpError } from '../../api/apiClient';

type Envelope = [Record<string, unknown>, [Record<string, unknown>, unknown][]];
const envelopes: Envelope[] = [];

function sentEvents(): Record<string, unknown>[] {
  return envelopes.flatMap(([, items]) =>
    items.filter(([header]) => header.type === 'event').map(([, payload]) => payload as Record<string, unknown>),
  );
}

beforeAll(() => {
  Sentry.init({
    ...sentryBrowserOptions('https://public@o0.ingest.sentry.io/0', 'test-sha', 'test'),
    // No tracing in the test — only the error path is under test.
    integrations: [],
    tracesSampleRate: 0,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope as unknown as Envelope);
        return {};
      },
      flush: async () => true,
    }),
  });
});

afterAll(async () => {
  await Sentry.close();
});

describe('frontend Sentry capture', () => {
  it('sends a real failure with area/stage/status tags, release and environment', async () => {
    captureError(new ApiHttpError('/api/feedback/v3', 502), {
      area: 'learn_feedback',
      stage: 'all_engines_failed',
      engines: 'groq',
      authHeader: 'Bearer eyJhbGciOi.payload.sig',
    });
    await Sentry.flush(2000);

    const events = sentEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as {
      release?: string;
      environment?: string;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
      exception?: { values?: { type?: string; value?: string }[] };
    };
    // Printed so the captured payload can be eyeballed in the test output.
    console.log('[sentry frontend event]', JSON.stringify({ tags: event.tags, extra: event.extra, exception: { type: event.exception?.values?.[0]?.type, value: event.exception?.values?.[0]?.value }, release: event.release, environment: event.environment }, null, 2));
    expect(event.release).toBe('test-sha');
    expect(event.environment).toBe('test');
    expect(event.tags).toMatchObject({ area: 'learn_feedback', stage: 'all_engines_failed', status: '502' });
    expect(event.exception?.values?.[0]).toMatchObject({ type: 'ApiHttpError', value: 'API /api/feedback/v3 → 502' });
    expect(JSON.stringify(event)).not.toContain('eyJhbGciOi.payload.sig');
  });

  it('tags an event with the ids that match it to its sessions row, and clears them', async () => {
    tagSentryIds({ lastSessionId: '1763715600000-ab12c', questionId: 'fre_12::followup', scoringSessionId: 'exam-sim-3f2c' });
    captureError(new Error('ids probe 1'), { area: 'learn_feedback', stage: 'ids' });
    tagSentryIds({ questionId: null, scoringSessionId: null });
    captureError(new Error('ids probe 2'), { area: 'learn_feedback', stage: 'ids' });
    await Sentry.flush(2000);
    const [first, second] = sentEvents().filter(e => JSON.stringify(e).includes('ids probe')) as { tags?: Record<string, string> }[];
    expect(first.tags).toMatchObject({ last_session_id: '1763715600000-ab12c', question_id: 'fre_12::followup', scoring_session_id: 'exam-sim-3f2c' });
    expect(second.tags?.last_session_id).toBe('1763715600000-ab12c');
    // A cleared tag is undefined, which JSON (the wire format) drops.
    expect(JSON.parse(JSON.stringify(second.tags))).not.toHaveProperty('question_id');
    expect(JSON.parse(JSON.stringify(second.tags))).not.toHaveProperty('scoring_session_id');
    tagSentryIds({ lastSessionId: null });
  });

  it('sends nothing for expected states', async () => {
    const before = sentEvents().length;
    captureError(new AuthRequiredError(), { area: 'learn_feedback' });
    captureError(new ApiHttpError('/api/feedback/v3', 429), { area: 'learn_feedback' });
    captureError(new ApiHttpError('/api/feedback/v3', 409), { area: 'examiner_feedback' });
    await Sentry.flush(2000);
    expect(sentEvents().length).toBe(before);
  });

  it('stops repeating the same failure after a few per page load', async () => {
    const before = sentEvents().length;
    for (let i = 0; i < 10; i++) captureError(new Error('quota exceeded'), { area: 'storage', stage: 'set' });
    await Sentry.flush(2000);
    // Sentry's own Dedupe drops back-to-back identical events too; either way, never all ten.
    const sent = sentEvents().length - before;
    expect(sent).toBeGreaterThanOrEqual(1);
    expect(sent).toBeLessThanOrEqual(3);
  });
});
