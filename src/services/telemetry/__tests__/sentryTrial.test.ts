// @vitest-environment jsdom
// The school-trial Sentry setup: sampling, the extra scrubbing (replay URLs,
// join codes, logs, metrics), what a product event becomes in Sentry (a log and
// metrics), and the runtime description. The SDK part runs the real
// @sentry/react with the app's own options and a recording transport.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import {
  parseRate,
  redactRecordingEvent,
  redactUrl,
  resolveSampleRates,
  stripAttributeSecrets,
  stripBreadcrumbSecrets,
  stripReplaySummarySecrets,
  tracePropagationTargetsFor,
} from '../sentryFilters';
import { logLevelFor, planMetrics } from '../sentrySignals';
import { describeRuntime } from '../sentryRuntime';
import { reportUserFeedback, sentryBrowserOptions, sentryReplayOptions, track } from '../telemetryService';
import { normaliseRoute } from '../analyticsRoute';

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.payload-secret.sig';

describe('sampling', () => {
  it('defaults to everything on for the trial, profiling a sample', () => {
    expect(resolveSampleRates({})).toEqual({ traces: 1, replaySession: 1, replayOnError: 1, profileSession: 0.5 });
  });

  it('takes build-time overrides and ignores nonsense', () => {
    expect(
      resolveSampleRates({
        VITE_SENTRY_TRACES_SAMPLE_RATE: '0.2',
        VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE: '0',
        VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE: '7',
        VITE_SENTRY_PROFILE_SAMPLE_RATE: 'lots',
      }),
    ).toEqual({ traces: 0.2, replaySession: 0, replayOnError: 1, profileSession: 0.5 });
    expect(parseRate('', 0.3)).toBe(0.3);
  });

  it('puts every rate on the SDK options', () => {
    const o = sentryBrowserOptions('https://public@o0.ingest.sentry.io/0', 'sha', 'production', {});
    expect(o.tracesSampleRate).toBe(1);
    expect(o.replaysSessionSampleRate).toBe(1);
    expect(o.replaysOnErrorSampleRate).toBe(1);
    expect(o.profileSessionSampleRate).toBe(0.5);
    expect(o.enableLogs).toBe(true);
    expect(o.enableMetrics).toBe(true);
    // Never collected, whatever the rates: cookies and HTTP bodies.
    expect(o.dataCollection).toMatchObject({ cookies: false, httpBodies: [] });
  });
});

describe('trace propagation', () => {
  it('covers our API and the scoring service, never a third party', () => {
    const targets = tracePropagationTargetsFor('https://french-scoring.onrender.com');
    const hit = (url: string) => targets.some((t) => (t instanceof RegExp ? t.test(url) : url.includes(t)));
    expect(hit('/api/feedback')).toBe(true);
    expect(hit('https://french-scoring.onrender.com/score')).toBe(true);
    expect(hit('https://abc.supabase.co/rest/v1/sessions')).toBe(false);
    expect(hit('https://us.i.posthog.com/e/')).toBe(false);
    expect(hit('https://french-scoring.onrender.com.evil.example/score')).toBe(false);
  });

  it('survives a malformed scoring URL', () => {
    expect(tracePropagationTargetsFor('not a url')).toHaveLength(2);
  });
});

describe('class join codes', () => {
  it('are redacted from URLs, and from route names', () => {
    expect(redactUrl('https://app.example/join/AB12CD')).toBe('https://app.example/join/[Filtered]');
    expect(redactUrl('/join/AB12CD?utm_source=x')).toBe('/join/[Filtered]?utm_source=x');
    expect(normaliseRoute('/join/AB12CD')).toBe('/join/:id');
  });

  it('are redacted in the URL-encoded returnTo the sign-in redirect adds', () => {
    expect(redactUrl('/onboarding?returnTo=%2Fjoin%2FAB12CD%3Ffoo%3D1')).toBe('/onboarding?returnTo=%2Fjoin%2F[Filtered]%3Ffoo%3D1');
  });

  it('leave a route name alone', () => {
    expect(redactUrl('/join/:id')).toBe('/join/:id');
  });

  it('are redacted from a log message too', () => {
    const log = stripAttributeSecrets({ message: 'could not open /join/AB12CD' });
    expect(log.message).toBe('could not open /join/[Filtered]');
  });

  it('leaves a bare token=… in a console message out of logs', () => {
    const log = stripAttributeSecrets({ message: 'refresh failed token=abc123secret retrying', attributes: { note: 'password=hunter2' } });
    expect(JSON.stringify(log)).not.toContain('abc123secret');
    expect(JSON.stringify(log)).not.toContain('hunter2');
    expect(log.message).toBe('refresh failed token=[Filtered] retrying');
  });
});

describe('session replay scrubbing', () => {
  it('redacts the URL of a page-meta event', () => {
    const meta = redactRecordingEvent({ type: 4, data: { href: `https://app.example/parent#${TOKEN}`, width: 1, height: 1 } });
    expect(meta.data.href).toBe('https://app.example/parent#[Filtered]');
  });

  it('redacts navigation breadcrumbs and network spans', () => {
    const crumb = redactRecordingEvent({
      type: 5,
      data: { tag: 'breadcrumb', payload: { category: 'navigation', data: { from: '/join/AB12CD', to: `/reset?access_token=${TOKEN}` } } },
    });
    expect(JSON.stringify(crumb)).not.toContain('AB12CD');
    expect(JSON.stringify(crumb)).not.toContain(TOKEN);

    const span = redactRecordingEvent({ type: 5, data: { tag: 'performanceSpan', payload: { op: 'resource.fetch', description: `https://x/api?token=${TOKEN}` } } });
    expect(JSON.stringify(span)).not.toContain(TOKEN);
  });

  it('leaves DOM snapshots alone', () => {
    const snapshot = { type: 2, data: { node: { attributes: { href: '/join/AB12CD' } } } };
    expect(redactRecordingEvent(snapshot)).toBe(snapshot);
    expect(snapshot.data.node.attributes.href).toBe('/join/AB12CD');
  });

  it("redacts the replay summary's page list", () => {
    const out = stripReplaySummarySecrets({ type: 'replay_event', urls: [`https://app.example/parent#${TOKEN}`, '/learn'] });
    expect(out.urls).toEqual(['https://app.example/parent#[Filtered]', '/learn']);
    // Only replay events are touched.
    const other = { type: 'transaction', urls: ['/join/AB12CD'] };
    expect(stripReplaySummarySecrets(other).urls).toEqual(['/join/AB12CD']);
  });

  it('masks text, inputs and media by default; only a build flag unmasks text, never inputs or media', () => {
    expect(sentryReplayOptions({})).toMatchObject({ maskAllText: true, maskAllInputs: true, blockAllMedia: true, networkDetailAllowUrls: [] });
    expect(sentryReplayOptions({ VITE_SENTRY_REPLAY_MASK_TEXT: '0' })).toMatchObject({ maskAllText: false, maskAllInputs: true, blockAllMedia: true });
    expect(sentryReplayOptions({}).beforeAddRecordingEvent).toBe(redactRecordingEvent);
  });

  it('is not in the startup options (it is downloaded after first paint)', () => {
    const names = (sentryBrowserOptions('https://public@o0.ingest.sentry.io/0', 'sha', 'production', {}).integrations as { name: string }[]).map((i) => i.name);
    expect(names).not.toContain('Replay');
    expect(names).toEqual(expect.arrayContaining(['BrowserTracing', 'BrowserProfiling']));
  });
});

describe('logs and metrics are scrubbed like events', () => {
  it('redacts tokens in a log message and its attributes', () => {
    const log = stripAttributeSecrets({ message: `fetch /x?token=${TOKEN}`, attributes: { url: `/join/AB12CD`, status: 200, typed: { value: `Bearer ${TOKEN}`, type: 'string' } } });
    expect(JSON.stringify(log)).not.toContain(TOKEN);
    expect(JSON.stringify(log)).not.toContain('AB12CD');
    expect(log.attributes.status).toBe(200);
  });
});

describe('console breadcrumbs', () => {
  it('are scrubbed in their raw arguments, strings and logged objects alike', () => {
    const crumb = stripBreadcrumbSecrets({
      message: 'refresh failed token=abc123secret',
      data: { logger: 'console', arguments: ['refresh failed token=abc123secret', { headers: { Authorization: `Bearer ${TOKEN}` }, url: '/join/AB12CD' }] },
    });
    expect(JSON.stringify(crumb)).not.toContain('abc123secret');
    expect(JSON.stringify(crumb)).not.toContain(TOKEN);
    expect(JSON.stringify(crumb)).not.toContain('AB12CD');
  });
});

describe('a product event as Sentry data', () => {
  it('chooses a log level from what happened', () => {
    expect(logLevelFor('learn_session_completed', {})).toBe('info');
    expect(logLevelFor('feedback_failed', { reason: 'timeout' })).toBe('warn');
    expect(logLevelFor('exam_scoring_failed', {})).toBe('error');
    expect(logLevelFor('mic_permission', { result: 'denied' })).toBe('warn');
    expect(logLevelFor('mic_permission', { result: 'granted' })).toBe('info');
    expect(logLevelFor('transcript_result', { source: 'captions', fallback_reason: 'asr-failed' })).toBe('warn');
    expect(logLevelFor('transcript_result', { source: 'whisper', fallback_reason: null })).toBe('info');
  });

  it('counts the event, slices it by category and measures its numbers', () => {
    const plan = planMetrics('feedback_shown', {
      source: 'ai',
      offline_reason: null,
      latency_ms: 4200,
      overall_score: 7,
      error_count: 3,
      style: 'coach',
      first_time: true,
    });
    expect(plan.counter).toBe('app.feedback_shown');
    expect(plan.attributes).toEqual({ source: 'ai', style: 'coach', first_time: true });
    expect(plan.distributions).toEqual([
      { name: 'app.feedback_shown.latency_ms', value: 4200, unit: 'millisecond' },
      { name: 'app.feedback_shown.overall_score', value: 7 },
      { name: 'app.feedback_shown.error_count', value: 3 },
    ]);
  });

  it('never makes a record id a metric dimension or measurement', () => {
    const plan = planMetrics('practice_step_completed', { question_id: 'sch_12', outcome: 'pass', provider: 'azure', attempts: 2 });
    expect(plan.attributes).toEqual({ outcome: 'pass', provider: 'azure' });
    expect(plan.distributions).toEqual([{ name: 'app.practice_step_completed.attempts', value: 2 }]);
    const exam = planMetrics('exam_pronunciation_audio_measured', { session_id: 's-1', turn_key: 3, part: 'topic1', status: 'measured', raw_s: 4.2, trimmed_s: 3.1 });
    expect(exam.attributes).toEqual({ part: 'topic1', status: 'measured' });
    expect(exam.distributions.map((d) => d.name)).toEqual(['app.exam_pronunciation_audio_measured.raw_s', 'app.exam_pronunciation_audio_measured.trimmed_s']);
  });
});

describe('describeRuntime', () => {
  function fakeWindow(overrides: Record<string, unknown> = {}, nav: Record<string, unknown> = {}): Window & typeof globalThis {
    return {
      innerWidth: 390,
      innerHeight: 800,
      devicePixelRatio: 3,
      screen: { width: 390, height: 844 },
      isSecureContext: true,
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      MediaRecorder: class {},
      Notification: { permission: 'default' },
      navigator: {
        onLine: true,
        language: 'en-IN',
        languages: ['en-IN', 'en'],
        maxTouchPoints: 5,
        hardwareConcurrency: 4,
        deviceMemory: 2,
        connection: { effectiveType: '3g', downlink: 1.4, rtt: 300, saveData: true },
        mediaDevices: { getUserMedia: () => undefined },
        serviceWorker: { controller: {} },
        ...nav,
      },
      ...overrides,
    } as unknown as Window & typeof globalThis;
  }

  it('reports what a learner phone can do, as tags and context', () => {
    const { tags, context } = describeRuntime(fakeWindow({ webkitSpeechRecognition: class {} }));
    expect(tags).toMatchObject({
      display_mode: 'standalone',
      speech_recognition: 'yes',
      media_recorder: 'yes',
      mic_api: 'yes',
      online: 'yes',
      connection: '3g',
      save_data: 'yes',
      device_memory_gb: '2',
      cpu_cores: '4',
      touch: 'yes',
    });
    expect(context).toMatchObject({ viewport: '390x800', pixel_ratio: 3, speech_recognition: true, service_worker_controlled: true, notifications: 'default' });
  });

  it('flags a browser with no speech recognition', () => {
    const { tags } = describeRuntime(fakeWindow({ matchMedia: () => ({ matches: false }) }));
    expect(tags.speech_recognition).toBe('no');
    expect(tags.display_mode).toBe('browser');
  });
});

// ── The real SDK ─────────────────────────────────────────────────────────────

type Envelope = [Record<string, unknown>, [Record<string, unknown>, unknown][]];
const envelopes: Envelope[] = [];

function items(type: string): { header: Record<string, unknown>; payload: unknown }[] {
  return envelopes.flatMap(([, list]) => list.filter(([h]) => h.type === type).map(([header, payload]) => ({ header, payload })));
}

describe('with the real SDK', () => {
  beforeAll(() => {
    vi.stubEnv('PROD', true);
    Sentry.init({
      ...sentryBrowserOptions('https://public@o0.ingest.sentry.io/0', 'test-sha', 'test', {}),
      // Replay, profiling and page-load tracing need a real browser.
      integrations: [Sentry.featureFlagsIntegration()],
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
    vi.unstubAllEnvs();
    await Sentry.close();
  });

  it('turns track() into a log line and metrics, with no extra properties', async () => {
    track({ name: 'feedback_failed', props: { reason: 'timeout', status: null, style: 'coach', transcript: 'Je suis allé au cinéma' } as never });
    track({ name: 'feedback_shown', props: { source: 'ai', offline_reason: null, latency_ms: 4200, overall_score: 7, error_count: 3, style: 'coach', first_time: false } });
    await Sentry.flush(2000);

    const logs = items('log').flatMap((i) => (i.payload as { items: { body: string; level: string; attributes: Record<string, { value: unknown }> }[] }).items);
    const failed = logs.find((l) => l.body === 'feedback_failed');
    expect(failed?.level).toBe('warn');
    expect(failed?.attributes.reason.value).toBe('timeout');
    expect(failed?.attributes.event_kind.value).toBe('product');
    expect(JSON.stringify(logs)).not.toContain('cinéma');

    const metrics = items('trace_metric').flatMap((i) => (i.payload as { items: { name: string; value: number; unit?: string; type: string }[] }).items);
    expect(metrics.find((m) => m.name === 'app.feedback_failed')).toMatchObject({ type: 'counter', value: 1 });
    expect(metrics.find((m) => m.name === 'app.feedback_shown.latency_ms')).toMatchObject({ type: 'distribution', value: 4200, unit: 'millisecond' });
  });

  it('scrubs a token out of a log before it is sent', async () => {
    Sentry.logger.info('opened', { url: `https://app.example/reset?access_token=${TOKEN}` });
    await Sentry.flush(2000);
    expect(JSON.stringify(items('log'))).not.toContain(TOKEN);
  });

  it('sends learner feedback as User Feedback', async () => {
    reportUserFeedback({ message: 'Q3 was marked wrong', email: 'me@example.com', kind: 'marking', route: '/learn' });
    await Sentry.flush(2000);
    const sent = items('feedback').map((i) => i.payload as { contexts?: { feedback?: { message?: string; contact_email?: string } }; tags?: Record<string, string> });
    expect(sent).toHaveLength(1);
    expect(sent[0].contexts?.feedback).toMatchObject({ message: 'Q3 was marked wrong', contact_email: 'me@example.com' });
    expect(sent[0].tags).toMatchObject({ feedback_kind: 'marking', route: '/learn' });
  });
});
