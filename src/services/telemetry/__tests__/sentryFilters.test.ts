import { describe, expect, it } from 'vitest';
import {
  errorStatus,
  isExpectedFailure,
  isNetworkError,
  redactUrl,
  resolveSentryEnvironment,
  stripEventSecrets,
  stripTransactionSecrets,
  toReportableError,
} from '../sentryFilters';
import { sentryBrowserOptions } from '../telemetryService';
import { AuthRequiredError } from '../../../lib/authToken';
import { ConsentRequiredError } from '../../../lib/consentRequired';
import { ApiHttpError, ExaminerQuotaExceededError, TranscribeHttpError, TranscribeTimeoutError } from '../../api/apiClient';
import { ScoringApiError } from '../../exam/scoringApiClient';

function named(name: string): Error {
  const e = new Error(name);
  e.name = name;
  return e;
}

describe('isExpectedFailure', () => {
  it.each([
    ['guest limit / signed out', new AuthRequiredError()],
    ['guardian consent pending', new ConsentRequiredError()],
    ['examiner daily quota', new ExaminerQuotaExceededError()],
    ['quota 429', new ApiHttpError('/api/feedback/v3', 429)],
    ['already_generated 409', new ApiHttpError('/api/feedback/v3', 409)],
    ['validation 422', new ApiHttpError('/api/feedback/v3', 422)],
    ['transcribe 429', new TranscribeHttpError(429, 30)],
    ['scoring 401', new ScoringApiError('unauthorized', 401)],
    ['plain "API → 429" message', new Error('API /api/feedback/stream → 429')],
    ['user cancelled', named('AbortError')],
    ['mic permission denied', named('NotAllowedError')],
  ])('%s is expected', (_label, err) => {
    expect(isExpectedFailure(err)).toBe(true);
  });

  it.each([
    ['server 500', new ApiHttpError('/api/feedback/v3', 500)],
    ['bad gateway', new Error('API /api/feedback/stream → 502')],
    ['transcription timeout', new TranscribeTimeoutError()],
    ['scoring 5xx', new ScoringApiError('scoring failed', 500, 'judge_unavailable')],
    ['scoring timeout (no status)', new ScoringApiError('Polling the scoring service timed out.')],
    ['generic bug', new TypeError("Cannot read properties of undefined (reading 'x')")],
  ])('%s is reported', (_label, err) => {
    expect(isExpectedFailure(err)).toBe(false);
  });
});

describe('errorStatus', () => {
  it('reads status fields and "→ NNN" messages', () => {
    expect(errorStatus(new ApiHttpError('/x', 503))).toBe(503);
    expect(errorStatus({ statusCode: 429 })).toBe(429);
    expect(errorStatus(new Error('API /api/transcribe → 500'))).toBe(500);
    expect(errorStatus(new Error('nope'))).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('recognises fetch failures from each browser', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(false);
  });
});

describe('toReportableError', () => {
  it('wraps a Supabase error object in a titled Error', () => {
    const e = toReportableError({ message: 'permission denied for table sessions', code: '42501', details: null });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('SupabaseError(42501)');
    expect(e.message).toBe('permission denied for table sessions');
  });
});

describe('resolveSentryEnvironment', () => {
  it('prefers VERCEL_ENV, falls back to the Vite mode', () => {
    expect(resolveSentryEnvironment('preview', 'production')).toBe('preview');
    expect(resolveSentryEnvironment('production', 'production')).toBe('production');
    expect(resolveSentryEnvironment('', 'production')).toBe('production');
    expect(resolveSentryEnvironment(undefined, 'development')).toBe('development');
  });
});

describe('stripEventSecrets', () => {
  it('removes Authorization, cookies and tokens in URLs', () => {
    const event = stripEventSecrets({
      request: {
        url: 'https://app.example/auth/callback?code=abc123&next=/learn#access_token=eyJhbGciOi.payload.sig',
        headers: { Authorization: 'Bearer eyJhbGciOi.payload.sig', 'User-Agent': 'test' },
        cookies: { sb: 'session' },
      },
      exception: { values: [{ value: 'fetch failed with Bearer eyJhbGciOi.payload.sig' }] },
      breadcrumbs: [{ data: { url: '/api/transcribe?token=secret', request_headers: { authorization: 'Bearer x' } } }],
    });
    expect(event.request?.headers).toEqual({ Authorization: '[Filtered]', 'User-Agent': 'test' });
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.url).toBe('https://app.example/auth/callback?code=[Filtered]&next=/learn#access_token=[Filtered]');
    expect(event.exception?.values?.[0].value).toBe('fetch failed with Bearer [Filtered]');
    expect(event.breadcrumbs?.[0].data).toEqual({ url: '/api/transcribe?token=[Filtered]', request_headers: { authorization: '[Filtered]' } });
  });

  it('leaves ordinary URLs alone', () => {
    expect(redactUrl('/api/questions/random?topic=school')).toBe('/api/questions/random?topic=school');
    expect(redactUrl('/learn#top')).toBe('/learn#top');
    expect(redactUrl('error #42 at /learn')).toBe('error #42 at /learn');
  });

  // Security review F13: the parent link's token is a bare hash.
  it('removes a bare-hash token such as the parent link', () => {
    const token = 'a'.repeat(64);
    expect(redactUrl(`https://app.example/parent#${token}`)).toBe('https://app.example/parent#[Filtered]');
    expect(redactUrl(`navigated to /parent#${token} ok`)).toBe('navigated to /parent#[Filtered] ok');
  });
});

describe('stripTransactionSecrets (F13)', () => {
  const token = 'b'.repeat(64);

  it('redacts the request URL, span descriptions and span data of a trace', () => {
    const event = stripTransactionSecrets({
      transaction: `/parent#${token}`,
      request: { url: `https://app.example/parent#${token}` },
      spans: [
        { description: 'GET https://app.example/guardian-consent?token=secret', data: { url: '/unsubscribe?token=abc' } },
      ],
      contexts: { trace: { data: { 'http.url': `https://app.example/parent#${token}` } } },
    });
    expect(event.transaction).toBe('/parent#[Filtered]');
    expect(event.request?.url).toBe('https://app.example/parent#[Filtered]');
    expect(event.spans?.[0].description).toBe('GET https://app.example/guardian-consent?token=[Filtered]');
    expect(event.spans?.[0].data).toEqual({ url: '/unsubscribe?token=[Filtered]' });
    expect(event.contexts?.trace?.data).toEqual({ 'http.url': 'https://app.example/parent#[Filtered]' });
  });

  it('is wired into the browser SDK options', () => {
    const options = sentryBrowserOptions('https://public@o0.ingest.sentry.io/0', 'sha', 'test');
    expect(options.beforeSendTransaction).toBeTypeOf('function');
    const out = options.beforeSendTransaction!(
      { type: 'transaction', request: { url: `/parent#${token}` } } as never,
      {},
    ) as { request?: { url?: string } };
    expect(out.request?.url).toBe('/parent#[Filtered]');
  });
});
