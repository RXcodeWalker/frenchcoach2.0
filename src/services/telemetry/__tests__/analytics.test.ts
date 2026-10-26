// @vitest-environment jsdom
// Product analytics (PostHog): the privacy allow-list, the transport's
// privacy floor, URL sanitising, and the identity transitions.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { MAX_STRING_PROP_LENGTH, filterEventProps, track, type TelemetryEvent } from '../telemetryService';
import { posthogOptions, sanitizeCapture, sanitizeUrl, setAnalyticsClientForTests, type AnalyticsClient } from '../posthogClient';
import { syncAnalyticsIdentity } from '../analyticsIdentity';
import { claimDailyOpen, claimFirstTime, getIdentifiedUserId, setIdentifiedUserId } from '../analyticsState';
import { normaliseRoute } from '../analyticsRoute';

const FAKE_TRANSCRIPT =
  "Le week-end dernier je suis allé au cinéma avec mes amis et nous avons regardé un film d'horreur vraiment effrayant";

function fakeClient() {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    register: vi.fn(),
    setPersonProperties: vi.fn(),
    get_distinct_id: vi.fn(() => 'anon-123'),
  };
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: '7b0c2f4e-1111-4222-8333-944455556666',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User;
}

describe('filterEventProps — the property allow-list', () => {
  it('drops a key the event does not declare', () => {
    const out = filterEventProps('feedback_shown', {
      source: 'ai',
      overall_score: 7,
      transcript: 'je suis allé',
    });
    expect(out).toEqual({ source: 'ai', overall_score: 7 });
    expect(out).not.toHaveProperty('transcript');
  });

  it('drops a string longer than the cap, even under a declared key (a fake transcript)', () => {
    expect(FAKE_TRANSCRIPT.length).toBeGreaterThan(MAX_STRING_PROP_LENGTH);
    const out = filterEventProps('ai_failover', { requested_engine: 'groq', actual_engine: 'offline', reason: FAKE_TRANSCRIPT, latency_ms: 12 });
    expect(out).toEqual({ requested_engine: 'groq', actual_engine: 'offline', latency_ms: 12 });
  });

  it('keeps only primitives: objects, arrays and non-finite numbers are dropped', () => {
    const out = filterEventProps('learn_session_completed', {
      topic_key: 'school',
      questions_answered: 3,
      avg_score: Number.NaN,
      duration_ms: { nested: true },
      ended_early: [true],
    });
    expect(out).toEqual({ topic_key: 'school', questions_answered: 3 });
  });

  it('keeps null (an honest "no score") and booleans', () => {
    expect(filterEventProps('exam_completed', { total_score: null, counts_toward_progress: false })).toEqual({
      total_score: null,
      counts_toward_progress: false,
    });
  });

  it('sends nothing for an unknown event name', () => {
    expect(filterEventProps('not_an_event', { a: 1 })).toEqual({});
  });
});

describe('track → PostHog', () => {
  let client: ReturnType<typeof fakeClient>;

  beforeEach(() => {
    vi.stubEnv('PROD', true);
    client = fakeClient();
    setAnalyticsClientForTests(client as unknown as AnalyticsClient);
  });

  afterEach(() => {
    setAnalyticsClientForTests(null);
    vi.unstubAllEnvs();
  });

  it('sends the filtered props only', () => {
    // A caller slipping an extra key past the types (the cast) still can't send it.
    track({ name: 'answer_recorded', props: { input: 'speech', duration_ms: 4000, first_time: true, transcript: FAKE_TRANSCRIPT } } as unknown as TelemetryEvent);
    expect(client.capture).toHaveBeenCalledWith('answer_recorded', { input: 'speech', duration_ms: 4000, first_time: true });
  });

  it('keeps the budget-trimmed events out of PostHog', () => {
    track({ name: 'question_shown', props: { topic_key: 'school', level: 'A2', slot: 'target', position: 1 } });
    track({ name: 'feedback_received', props: { engine: 'groq', fallback_used: false, score: 6, latency_ms: 10, response_tier: 2 } });
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('a beacon event goes out synchronously, in the SDK\'s base64 wire format, still filtered', async () => {
    const sendBeacon = vi.fn<(url: string, body: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    track({ name: 'exam_abandoned', props: { last_part: 'prep', elapsed_ms: 900, note: FAKE_TRANSCRIPT } } as unknown as TelemetryEvent, { beacon: true });
    expect(client.capture).not.toHaveBeenCalled();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0];
    expect(url).toMatch(/\/e\/\?compression=base64$/);
    const text = await body.text();
    const payload = JSON.parse(Buffer.from(decodeURIComponent(text.replace(/^data=/, '')), 'base64').toString('utf8'));
    expect(payload).toMatchObject({ api_key: 'phc_test', event: 'exam_abandoned' });
    expect(payload.properties).toMatchObject({ last_part: 'prep', elapsed_ms: 900, distinct_id: 'anon-123' });
    expect(payload.properties).not.toHaveProperty('note');
    vi.unstubAllGlobals();
  });
});

describe('the PostHog privacy floor', () => {
  it('never autocaptures, records sessions or loads extra scripts', () => {
    const o = posthogOptions('https://us.i.posthog.com');
    expect(o).toMatchObject({
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_external_dependency_loading: true,
      mask_all_text: true,
    });
  });

  it('strips the hash and every non-UTM query parameter from URLs', () => {
    expect(sanitizeUrl('https://app.example/auth/callback?code=abc&utm_source=tiktok#access_token=secret')).toBe(
      'https://app.example/auth/callback?utm_source=tiktok',
    );
    expect(sanitizeUrl('/learn')).toBe('/learn');
    const result = sanitizeCapture({
      uuid: 'u',
      event: '$pageview',
      properties: { $current_url: 'https://app.example/reset-password#token=x' },
      $set_once: { $initial_current_url: 'https://app.example/?ref=1&utm_medium=ads' },
    });
    expect(result?.properties.$current_url).toBe('https://app.example/reset-password');
    expect(result?.$set_once?.$initial_current_url).toBe('https://app.example/?utm_medium=ads');
  });
});

describe('identity transitions', () => {
  let client: ReturnType<typeof fakeClient>;
  const NOW = Date.parse('2026-10-26T12:00:00Z');

  beforeEach(() => {
    vi.stubEnv('PROD', true);
    localStorage.clear();
    client = fakeClient();
    setAnalyticsClientForTests(client as unknown as AnalyticsClient);
  });

  afterEach(() => {
    setAnalyticsClientForTests(null);
    vi.unstubAllEnvs();
  });

  const events = () => client.capture.mock.calls.map((c) => [c[0], c[1]]);

  it('a new account: identify by user id (never email), then signed_up', () => {
    syncAnalyticsIdentity(user({ created_at: '2026-10-26T11:58:00Z', email: 'kid@example.com' }), false, NOW);
    expect(client.identify).toHaveBeenCalledWith('7b0c2f4e-1111-4222-8333-944455556666');
    expect(JSON.stringify(client.identify.mock.calls)).not.toContain('example.com');
    expect(events()).toEqual([['signed_up', { method: 'email' }]]);
  });

  it('signing in to an older account: signed_in with the provider', () => {
    syncAnalyticsIdentity(user({ app_metadata: { provider: 'google' } }), false, NOW);
    expect(events()).toEqual([['signed_in', { method: 'google' }]]);
  });

  it('a session restored on page load is identified silently, and only once', () => {
    syncAnalyticsIdentity(user({ last_sign_in_at: '2026-09-01T00:00:00Z' }), true, NOW);
    syncAnalyticsIdentity(user(), false, NOW);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(events()).toEqual([]);
  });

  it('sign-out: signed_out, then reset to a fresh anonymous id', () => {
    setIdentifiedUserId('7b0c2f4e-1111-4222-8333-944455556666');
    syncAnalyticsIdentity(null, false, NOW);
    expect(events()).toEqual([['signed_out', {}]]);
    expect(client.reset).toHaveBeenCalledTimes(1);
    expect(getIdentifiedUserId()).toBeNull();
  });

  it('a guest who never signed in: nothing', () => {
    syncAnalyticsIdentity(null, true, NOW);
    expect(events()).toEqual([]);
    expect(client.reset).not.toHaveBeenCalled();
  });
});

describe('device bookkeeping', () => {
  beforeEach(() => localStorage.clear());

  it('app_opened is claimed once per local day', () => {
    expect(claimDailyOpen(new Date(2026, 9, 20, 9))).toEqual({ first_visit: true, days_since_last_visit: null });
    expect(claimDailyOpen(new Date(2026, 9, 20, 22))).toBeNull();
    expect(claimDailyOpen(new Date(2026, 9, 23, 8))).toEqual({ first_visit: false, days_since_last_visit: 3 });
  });

  it('a first-time milestone is true exactly once', () => {
    expect(claimFirstTime('answer')).toBe(true);
    expect(claimFirstTime('answer')).toBe(false);
    expect(claimFirstTime('feedback')).toBe(true);
  });

  it('routes collapse ids and keep no query', () => {
    expect(normaliseRoute('/learn')).toBe('/learn');
    expect(normaliseRoute('/junior/animals')).toBe('/junior/:id');
    expect(normaliseRoute('/duel/9f3c2a1b-0000-4000-8000-123456789abc')).toBe('/duel/:id');
    expect(normaliseRoute('/onboarding/placement')).toBe('/onboarding/placement');
    expect(normaliseRoute('/admin/questions/new')).toBe('/admin/questions/new');
  });
});
