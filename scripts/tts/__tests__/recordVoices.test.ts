import { describe, expect, it, vi } from 'vitest';
import {
  AZURE_MIN_INTERVAL_MS,
  BUDGET_LIMIT_CHARS,
  buildSsml,
  formatSummary,
  parseArgs,
  readEnv,
  recordVoices,
  xmlEscape,
  type RecordDeps,
  type RecordEnv,
  type RecordOptions,
} from '../recordVoices';
import type { CatalogueLine } from '../collectLines';
import { voiceObjectPath } from '../../../src/services/tts/voiceKey';

const ENV: RecordEnv = {
  azureKey: 'azure-secret',
  azureRegion: 'westeurope',
  supabaseUrl: 'https://proj.supabase.co',
  serviceKey: 'service-secret',
};

const OPTIONS: RecordOptions = { dryRun: false, limit: null, voices: ['henri'], allowOver: false };

const MP3 = new Uint8Array(2048).fill(1);

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

type Handler = (call: Call) => Response | undefined;

/**
 * A fake Supabase + Azure. Defaults: the bucket exists, nothing is stored,
 * Azure returns a valid MP3 and every upload succeeds. `azure` and
 * `existing` override per test.
 */
function fakeNetwork(opts: { existing?: string[]; azure?: Handler; bucketMissing?: boolean } = {}) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body,
    };
    calls.push(call);
    const { url, method } = call;
    if (url.includes('tts.speech.microsoft.com')) {
      return (
        opts.azure?.(call) ??
        new Response(MP3, { status: 200, headers: { 'content-type': 'audio/mpeg' } })
      );
    }
    if (url.endsWith('/storage/v1/bucket/tts-audio') && method === 'GET') {
      return opts.bucketMissing
        ? new Response(JSON.stringify({ statusCode: '404', error: 'Bucket not found' }), { status: 400 })
        : new Response(JSON.stringify({ id: 'tts-audio', public: true }), { status: 200 });
    }
    if (url.endsWith('/storage/v1/bucket') && method === 'POST') return new Response('{}', { status: 200 });
    if (url.includes('/storage/v1/object/list/tts-audio')) {
      const { prefix } = JSON.parse(String(call.body)) as { prefix: string };
      const names = (opts.existing ?? []).filter((p) => p.startsWith(`${prefix}/`)).map((p) => ({ name: p.slice(prefix.length + 1), id: p }));
      return new Response(JSON.stringify(names), { status: 200 });
    }
    if (url.includes('/storage/v1/object/tts-audio/') && method === 'POST') return new Response('{"Key":"x"}', { status: 200 });
    throw new Error(`unexpected ${method} ${url}`);
  });
  return { calls, fetchFn };
}

function deps(fetchFn: RecordDeps['fetch']) {
  let clock = 0;
  const sleeps: number[] = [];
  const logs: string[] = [];
  const d: RecordDeps = {
    fetch: fetchFn,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    log: (m) => logs.push(m),
  };
  return { d, sleeps, logs };
}

const azureCalls = (calls: Call[]) => calls.filter((c) => c.url.includes('tts.speech.microsoft.com'));
const uploads = (calls: Call[]) => calls.filter((c) => c.url.includes('/storage/v1/object/tts-audio/'));

const line = (text: string, source: CatalogueLine['source'] = 'exam'): CatalogueLine => ({ text, source });

describe('recordVoices', () => {
  it('skips a line already in the bucket and records only the missing one', async () => {
    const stored = await voiceObjectPath('Bonjour !', 'henri');
    const { calls, fetchFn } = fakeNetwork({ existing: [stored] });
    const { d } = deps(fetchFn);
    const summary = await recordVoices([line('Bonjour !'), line('Au revoir.')], OPTIONS, ENV, d);

    expect(summary).toMatchObject({ recorded: 1, skipped: 1, failed: [], aborted: null });
    expect(azureCalls(calls)).toHaveLength(1);
    expect(String(azureCalls(calls)[0].body)).toContain('Au revoir.');
    const path = await voiceObjectPath('Au revoir.', 'henri');
    expect(uploads(calls).map((c) => c.url)).toEqual([`https://proj.supabase.co/storage/v1/object/tts-audio/${path}`]);
    expect(uploads(calls)[0].headers).toMatchObject({ 'Content-Type': 'audio/mpeg', 'x-upsert': 'false' });
  });

  it('sends the Azure request with the planned headers and escapes the text in the SSML', async () => {
    const { calls, fetchFn } = fakeNetwork();
    const { d } = deps(fetchFn);
    await recordVoices([line(`Dis <voice> & "l'ami"`)], OPTIONS, ENV, d);

    const [azure] = azureCalls(calls);
    expect(azure.url).toBe('https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1');
    expect(azure.headers).toMatchObject({
      'Ocp-Apim-Subscription-Key': 'azure-secret',
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'french-coach-voices',
    });
    const body = String(azure.body);
    expect(body).toContain('<voice name="fr-FR-HenriNeural">');
    expect(body).toContain('Dis &lt;voice&gt; &amp; &quot;l&apos;ami&quot;');
    expect(body).not.toContain('<voice> &');
  });

  it('sends Azure the original text, not the normalised key text', () => {
    const ssml = buildSsml('Bonjour\u00A0!', 'henri');
    expect(ssml).toContain('xmlns:mstts="http://www.w3.org/2001/mstts"');
    expect(ssml).toContain('<voice name="fr-FR-HenriNeural"><mstts:silence type="Sentenceboundary" value="250ms"/>Bonjour\u00A0!</voice>');
    expect(ssml).not.toContain('prosody');
    expect(xmlEscape(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&apos;');
  });

  it('retries a 429, honouring Retry-After, then records', async () => {
    let n = 0;
    const { calls, fetchFn } = fakeNetwork({
      azure: () => (n++ === 0 ? new Response('slow down', { status: 429, headers: { 'retry-after': '7' } }) : undefined),
    });
    const { d, sleeps } = deps(fetchFn);
    const summary = await recordVoices([line('Bonjour !')], OPTIONS, ENV, d);

    expect(summary).toMatchObject({ recorded: 1, failed: [], aborted: null });
    expect(azureCalls(calls)).toHaveLength(2);
    expect(sleeps).toContain(7000);
  });

  it('backs off 5 s / 15 s / 45 s on 5xx and fails the line after 3 retries', async () => {
    const { calls, fetchFn } = fakeNetwork({ azure: () => new Response('down', { status: 503 }) });
    const { d, sleeps } = deps(fetchFn);
    const summary = await recordVoices([line('Bonjour !')], OPTIONS, ENV, d);

    expect(azureCalls(calls)).toHaveLength(4);
    expect(sleeps.filter((ms) => ms >= 5000)).toEqual([5000, 15000, 45000]);
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0].reason).toMatch(/503/);
    expect(uploads(calls)).toHaveLength(0);
  });

  it('aborts the whole run on a 401 and never logs the keys', async () => {
    const { calls, fetchFn } = fakeNetwork({ azure: () => new Response('bad key', { status: 401 }) });
    const { d, logs } = deps(fetchFn);
    const summary = await recordVoices([line('Un.'), line('Deux.')], OPTIONS, ENV, d);

    expect(summary.aborted).toMatch(/401/);
    expect(azureCalls(calls)).toHaveLength(1);
    expect(uploads(calls)).toHaveLength(0);
    const printed = [...logs, ...formatSummary(summary)].join('\n');
    expect(printed).not.toContain('azure-secret');
    expect(printed).not.toContain('service-secret');
  });

  it('trips the budget guard before calling Azure, unless --allow-over', async () => {
    const long = line('a'.repeat(BUDGET_LIMIT_CHARS + 1));
    const blocked = fakeNetwork();
    const summary = await recordVoices([long], OPTIONS, ENV, deps(blocked.fetchFn).d);
    expect(summary.aborted).toMatch(/budget guard/);
    expect(azureCalls(blocked.calls)).toHaveLength(0);

    const allowed = fakeNetwork();
    const over = await recordVoices([long], { ...OPTIONS, allowOver: true }, ENV, deps(allowed.fetchFn).d);
    expect(over.aborted).toBeNull();
    expect(azureCalls(allowed.calls)).toHaveLength(1);
  });

  it('makes no network call on --dry-run and needs no env', async () => {
    const { fetchFn } = fakeNetwork();
    const { d, logs } = deps(fetchFn);
    const summary = await recordVoices([line('Un.', 'learn'), line('Deux.', 'exam')], { ...OPTIONS, dryRun: true, voices: ['henri'] }, null, d);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ recorded: 0, skipped: 0, failed: [] });
    expect(logs.join('\n')).toMatch(/total\s+2 items\s+8 chars/);
  });

  it('spaces Azure requests at least 3.4 s apart', async () => {
    const { fetchFn } = fakeNetwork();
    const { d, sleeps } = deps(fetchFn);
    await recordVoices([line('Un.'), line('Deux.'), line('Trois.')], OPTIONS, ENV, d);
    expect(sleeps).toEqual([AZURE_MIN_INTERVAL_MS, AZURE_MIN_INTERVAL_MS]);
  });

  it('rejects a tiny or non-MP3 Azure response as failed, without uploading', async () => {
    let n = 0;
    const { calls, fetchFn } = fakeNetwork({
      azure: () =>
        n++ === 0
          ? new Response(new Uint8Array(100), { status: 200, headers: { 'content-type': 'audio/mpeg' } })
          : new Response(MP3, { status: 200, headers: { 'content-type': 'application/json' } }),
    });
    const summary = await recordVoices([line('Un.'), line('Deux.')], OPTIONS, ENV, deps(fetchFn).d);
    expect(summary.failed.map((f) => f.reason)).toEqual([
      expect.stringMatching(/100 bytes/),
      expect.stringMatching(/not audio\/mpeg/),
    ]);
    expect(uploads(calls)).toHaveLength(0);
    expect(formatSummary(summary)[1]).toContain('FAILED [exam, henri] "Un."');
  });

  it('creates a missing bucket as public, MP3-only, ≤ 1 MB', async () => {
    const { calls, fetchFn } = fakeNetwork({ bucketMissing: true });
    await recordVoices([line('Un.')], OPTIONS, ENV, deps(fetchFn).d);
    const create = calls.find((c) => c.url.endsWith('/storage/v1/bucket') && c.method === 'POST');
    expect(JSON.parse(String(create?.body))).toEqual({
      id: 'tts-audio',
      name: 'tts-audio',
      public: true,
      allowed_mime_types: ['audio/mpeg'],
      file_size_limit: 1048576,
    });
  });

  it('records at most --limit missing lines per voice', async () => {
    const { calls, fetchFn } = fakeNetwork();
    const summary = await recordVoices(
      [line('Un.'), line('Deux.'), line('Trois.')],
      { ...OPTIONS, limit: 2, voices: ['henri'] },
      ENV,
      deps(fetchFn).d,
    );
    expect(summary.recorded).toBe(2);
    expect(uploads(calls).filter((c) => c.url.includes('/v2/henri/'))).toHaveLength(2);
  });
});

describe('parseArgs / readEnv', () => {
  it('parses the flags the workflow passes, including an empty --limit', () => {
    expect(parseArgs(['--dry-run', '--limit', '5', '--voices', 'henri'])).toEqual({
      dryRun: true,
      limit: 5,
      voices: ['henri'],
      allowOver: false,
    });
    expect(parseArgs(['--limit=', '--allow-over'])).toMatchObject({ limit: null, allowOver: true, voices: ['henri'] });
    expect(() => parseArgs(['--limit', '0'])).toThrow(/positive integer/);
    expect(() => parseArgs(['--voices', 'bob'])).toThrow(/--voices/);
    expect(() => parseArgs(['--voices', 'denise'])).toThrow(/--voices/);
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
  });

  it('names every missing secret', () => {
    expect(() => readEnv({ AZURE_SPEECH_KEY: 'k' })).toThrow(/AZURE_SPEECH_REGION, SUPABASE_URL, SUPABASE_SERVICE_KEY/);
    expect(
      readEnv({ AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'r', SUPABASE_URL: 'https://x.co/', SUPABASE_SERVICE_ROLE_KEY: 's' }),
    ).toEqual({ azureKey: 'k', azureRegion: 'r', supabaseUrl: 'https://x.co', serviceKey: 's' });
  });
});
