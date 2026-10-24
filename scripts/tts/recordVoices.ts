/**
 * recordVoices.ts — records every catalogued French line in each Azure Neural
 * voice and stores it in the public Supabase bucket the app plays from
 * (recorded-voices plan §4.5). Azure is called here, once per line, never at
 * play time.
 *
 *   npm run voices:record -- --dry-run
 *   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
 *     npm run voices:record -- [--limit N] [--voices henri] [--allow-over]
 *
 * - Paths come from `src/services/tts/voiceKey.ts`, the same module the app
 *   uses, so a recording is found by exactly the text that is spoken.
 * - Re-running is safe: lines already in the bucket are skipped, so a stopped
 *   run resumes where it stopped. Files are content-addressed and uploaded
 *   with `x-upsert: false` — a path's content never changes.
 * - Azure F0 allows ~20 requests/min and 500k characters/month: requests are
 *   spaced ≥ 3.4 s apart, and a run that would send more than 450k characters
 *   aborts unless `--allow-over`.
 * - `--limit N` records at most N missing lines per voice.
 * - `--dry-run` prints the catalogue's counts and characters and makes no
 *   network call, so it needs no secrets.
 * - Line text is logged (it is authored content); keys never are.
 */

import { pathToFileURL } from 'node:url';
import { collectLines, type CatalogueLine, type LineSource } from './collectLines';
import {
  RECORDED_VOICES,
  TTS_BUCKET,
  VOICE_KEY_VERSION,
  voiceObjectPath,
  type RecordedVoiceId,
} from '../../src/services/tts/voiceKey';

export const AZURE_MIN_INTERVAL_MS = 3400;
export const RETRY_BACKOFF_MS = [5000, 15000, 45000] as const;
export const BUDGET_LIMIT_CHARS = 450_000;
export const MIN_AUDIO_BYTES = 1024;
const LIST_PAGE_SIZE = 1000;
const PROGRESS_EVERY = 25;
const REQUEST_TIMEOUT_MS = 30_000;
/**
 * Pause at each sentence end (Azure's default is long, so a line like the
 * greeting, four short sentences, dragged). Owner choice after listening,
 * 2026-10-24; speech itself is at Azure's normal rate.
 */
const SENTENCE_PAUSE = '250ms';

export interface RecordOptions {
  dryRun: boolean;
  limit: number | null;
  voices: RecordedVoiceId[];
  allowOver: boolean;
}

export interface RecordEnv {
  azureKey: string;
  azureRegion: string;
  supabaseUrl: string;
  serviceKey: string;
}

export interface RecordDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  log: (message: string) => void;
}

export interface Failure {
  voice: RecordedVoiceId;
  source: LineSource;
  text: string;
  reason: string;
}

export interface RecordSummary {
  recorded: number;
  skipped: number;
  failed: Failure[];
  charactersSent: number;
  /** Set when the whole run stopped early (bad credentials, budget, listing failure). */
  aborted: string | null;
}

/** A 401/403, or anything else that makes carrying on pointless. */
class AbortRun extends Error {}

// ── Arguments and environment ─────────────────────────────────────────────────

export function parseArgs(argv: readonly string[]): RecordOptions {
  const options: RecordOptions = { dryRun: false, limit: null, voices: Object.keys(RECORDED_VOICES) as RecordedVoiceId[], allowOver: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=', 2) as [string, string | undefined];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    switch (flag) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--allow-over':
        options.allowOver = true;
        break;
      case '--limit': {
        const raw = value().trim();
        if (raw === '') break; // the workflow passes an empty limit for "no limit"
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) throw new Error(`--limit must be a positive integer, got "${raw}"`);
        options.limit = n;
        break;
      }
      case '--voices': {
        const ids = value().split(',').map((v) => v.trim()).filter(Boolean);
        const unknown = ids.filter((v) => !(v in RECORDED_VOICES));
        if (ids.length === 0 || unknown.length > 0) {
          throw new Error(`--voices takes ${Object.keys(RECORDED_VOICES).join(',')}; got "${ids.join(',')}"`);
        }
        options.voices = [...new Set(ids)] as RecordedVoiceId[];
        break;
      }
      default:
        throw new Error(`Unknown argument "${argv[i]}"`);
    }
  }
  return options;
}

/** Reads the four secrets; throws naming every missing one. */
export function readEnv(env: NodeJS.ProcessEnv): RecordEnv {
  const values = {
    AZURE_SPEECH_KEY: env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: env.AZURE_SPEECH_REGION,
    SUPABASE_URL: env.SUPABASE_URL,
    // The repo's existing secret name (sendNotifications.ts); the plan's name is accepted too.
    SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const missing = Object.entries(values).filter(([, v]) => !v?.trim()).map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(', ')}. (--dry-run needs none.)`);
  }
  return {
    azureKey: values.AZURE_SPEECH_KEY!.trim(),
    azureRegion: values.AZURE_SPEECH_REGION!.trim(),
    supabaseUrl: values.SUPABASE_URL!.trim().replace(/\/+$/, ''),
    serviceKey: values.SUPABASE_SERVICE_KEY!.trim(),
  };
}

// ── SSML ──────────────────────────────────────────────────────────────────────

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** The original text goes to Azure, not the normalised key text. */
export function buildSsml(text: string, voice: RecordedVoiceId): string {
  return (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="fr-FR">' +
    `<voice name="${RECORDED_VOICES[voice]}"><mstts:silence type="Sentenceboundary" value="${SENTENCE_PAUSE}"/>` +
    `${xmlEscape(text)}</voice></speak>`
  );
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get('retry-after');
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

async function shortBody(res: Response): Promise<string> {
  try {
    return (await res.text()).replace(/\s+/g, ' ').slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * One request with the retry rule: 429/5xx/network error → honour
 * `Retry-After`, else back off 5 s/15 s/45 s, up to 3 retries; 401/403 aborts
 * the whole run. Any other response is returned for the caller to judge.
 * `beforeEach` runs before every attempt (the Azure throttle).
 */
async function requestWithRetry(
  deps: RecordDeps,
  label: string,
  doFetch: () => Promise<Response>,
  beforeEach?: () => Promise<void>,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await beforeEach?.();
    let res: Response | null = null;
    let networkError: string | null = null;
    try {
      res = await doFetch();
    } catch (err) {
      networkError = err instanceof Error ? err.message : String(err);
    }
    if (res && (res.status === 401 || res.status === 403)) {
      throw new AbortRun(`${label} answered ${res.status} — check the credentials. ${await shortBody(res)}`);
    }
    const retryable = res === null || res.status === 429 || res.status >= 500;
    if (!retryable) return res!;
    if (attempt >= RETRY_BACKOFF_MS.length) {
      if (res) return res;
      throw new Error(`${label}: ${networkError}`);
    }
    const waitMs = (res && retryAfterMs(res)) ?? RETRY_BACKOFF_MS[attempt];
    deps.log(`  ${label} ${res ? res.status : `error (${networkError})`}; retrying in ${Math.round(waitMs / 1000)} s`);
    await deps.sleep(waitMs);
  }
}

function supabaseHeaders(env: RecordEnv, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, ...extra };
}

/** Creates the bucket (public, MP3 only, ≤ 1 MB per file) if it is missing. */
async function ensureBucket(env: RecordEnv, deps: RecordDeps): Promise<void> {
  const res = await requestWithRetry(deps, 'Supabase bucket check', () =>
    deps.fetch(`${env.supabaseUrl}/storage/v1/bucket/${TTS_BUCKET}`, { headers: supabaseHeaders(env) }),
  );
  if (res.ok) {
    const bucket = (await res.json().catch(() => ({}))) as { public?: boolean };
    if (bucket.public === false) {
      deps.log(`WARNING: bucket "${TTS_BUCKET}" is private; the app can only play files from a public bucket.`);
    }
    return;
  }
  const body = await shortBody(res);
  if (res.status !== 404 && !(res.status === 400 && /not.?found/i.test(body))) {
    throw new AbortRun(`Supabase bucket check failed: ${res.status} ${body}`);
  }
  const created = await requestWithRetry(deps, 'Supabase bucket create', () =>
    deps.fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: supabaseHeaders(env, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        id: TTS_BUCKET,
        name: TTS_BUCKET,
        public: true,
        allowed_mime_types: ['audio/mpeg'],
        file_size_limit: 1048576,
      }),
    }),
  );
  if (!created.ok && created.status !== 409) {
    const createdBody = await shortBody(created);
    if (!/already exists/i.test(createdBody)) throw new AbortRun(`Could not create bucket: ${created.status} ${createdBody}`);
  }
  deps.log(`Created public bucket "${TTS_BUCKET}".`);
}

/** Every object path already stored under `<version>/<voice>/`, paginating the list API. */
async function listExisting(env: RecordEnv, deps: RecordDeps, prefix: string): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const res = await requestWithRetry(deps, 'Supabase list', () =>
      deps.fetch(`${env.supabaseUrl}/storage/v1/object/list/${TTS_BUCKET}`, {
        method: 'POST',
        headers: supabaseHeaders(env, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefix, limit: LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } }),
      }),
    );
    if (!res.ok) throw new AbortRun(`Could not list ${prefix}/: ${res.status} ${await shortBody(res)}`);
    const page = (await res.json()) as { name: string }[];
    for (const item of page) existing.add(`${prefix}/${item.name}`);
    if (page.length < LIST_PAGE_SIZE) return existing;
  }
}

// ── The run ───────────────────────────────────────────────────────────────────

interface Item {
  voice: RecordedVoiceId;
  line: CatalogueLine;
  path: string;
}

function preview(text: string): string {
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function printDryRun(items: Item[], options: RecordOptions, deps: RecordDeps): void {
  const rows = new Map<string, { count: number; chars: number }>();
  const add = (key: string, chars: number) => {
    const row = rows.get(key) ?? { count: 0, chars: 0 };
    row.count += 1;
    row.chars += chars;
    rows.set(key, row);
  };
  for (const item of items) add(`source ${item.line.source}`, item.line.text.length);
  for (const item of items) add(`voice  ${item.voice}`, item.line.text.length);
  deps.log('Dry run — no network calls. The whole catalogue, before skipping what is already stored:');
  for (const [key, row] of rows) deps.log(`  ${key.padEnd(20)} ${String(row.count).padStart(5)} items  ${String(row.chars).padStart(7)} chars`);
  const total = items.reduce((sum, i) => sum + i.line.text.length, 0);
  deps.log(`  ${'total'.padEnd(20)} ${String(items.length).padStart(5)} items  ${String(total).padStart(7)} chars`);
  if (options.limit !== null) deps.log(`  (--limit ${options.limit}: a real run records at most ${options.limit} missing lines per voice)`);
  if (total > BUDGET_LIMIT_CHARS) deps.log(`  Over the ${BUDGET_LIMIT_CHARS} character guard if nothing is stored yet.`);
}

export async function recordVoices(
  lines: readonly CatalogueLine[],
  options: RecordOptions,
  env: RecordEnv | null,
  deps: RecordDeps,
): Promise<RecordSummary> {
  const summary: RecordSummary = { recorded: 0, skipped: 0, failed: [], charactersSent: 0, aborted: null };

  const items: Item[] = [];
  for (const voice of options.voices) {
    for (const line of lines) items.push({ voice, line, path: await voiceObjectPath(line.text, voice) });
  }

  if (options.dryRun) {
    printDryRun(items, options, deps);
    return summary;
  }
  if (!env) throw new Error('recordVoices: env is required unless --dry-run');

  try {
    await ensureBucket(env, deps);

    const toRecord: Item[] = [];
    for (const voice of options.voices) {
      const existing = await listExisting(env, deps, `${VOICE_KEY_VERSION}/${voice}`);
      const missing = items.filter((i) => i.voice === voice && !existing.has(i.path));
      summary.skipped += items.filter((i) => i.voice === voice).length - missing.length;
      toRecord.push(...(options.limit === null ? missing : missing.slice(0, options.limit)));
    }

    const chars = toRecord.reduce((sum, i) => sum + i.line.text.length, 0);
    deps.log(`To record: ${toRecord.length} items, ${chars} characters (${summary.skipped} already stored).`);
    if (chars > BUDGET_LIMIT_CHARS && !options.allowOver) {
      throw new AbortRun(
        `${chars} characters is over the ${BUDGET_LIMIT_CHARS} budget guard (Azure F0 allows 500k/month). ` +
          'Use --limit, or --allow-over if this month has room.',
      );
    }

    let lastAzureStart: number | null = null;
    const throttle = async () => {
      if (lastAzureStart !== null) {
        const waitMs = AZURE_MIN_INTERVAL_MS - (deps.now() - lastAzureStart);
        if (waitMs > 0) await deps.sleep(waitMs);
      }
      lastAzureStart = deps.now();
    };

    for (let n = 0; n < toRecord.length; n++) {
      const item = toRecord[n];
      const fail = (reason: string) =>
        summary.failed.push({ voice: item.voice, source: item.line.source, text: item.line.text, reason });
      try {
        const audio = await synthesize(env, deps, item, throttle);
        summary.charactersSent += item.line.text.length;
        if (typeof audio === 'string') {
          fail(audio);
        } else {
          const stored = await upload(env, deps, item, audio);
          if (stored === 'exists') summary.skipped += 1;
          else if (stored === 'stored') summary.recorded += 1;
          else fail(stored);
        }
      } catch (err) {
        if (err instanceof AbortRun) throw err;
        fail(err instanceof Error ? err.message : String(err));
      }
      if ((n + 1) % PROGRESS_EVERY === 0 || n + 1 === toRecord.length) {
        deps.log(`[${n + 1}/${toRecord.length}] recorded ${summary.recorded}, failed ${summary.failed.length}`);
      }
    }
  } catch (err) {
    if (!(err instanceof AbortRun)) throw err;
    summary.aborted = err.message;
  }
  return summary;
}

/** The MP3 bytes, or a failure reason. */
async function synthesize(
  env: RecordEnv,
  deps: RecordDeps,
  item: Item,
  throttle: () => Promise<void>,
): Promise<Uint8Array | string> {
  const res = await requestWithRetry(
    deps,
    'Azure TTS',
    () =>
      deps.fetch(`https://${env.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': env.azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'french-coach-voices',
        },
        body: buildSsml(item.line.text, item.voice),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    throttle,
  );
  if (!res.ok) return `Azure ${res.status} ${await shortBody(res)}`;
  const type = res.headers.get('content-type') ?? '';
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!type.startsWith('audio/mpeg')) return `Azure returned ${type || 'no content type'}, not audio/mpeg`;
  if (bytes.byteLength < MIN_AUDIO_BYTES) return `Azure returned only ${bytes.byteLength} bytes`;
  return bytes;
}

async function upload(env: RecordEnv, deps: RecordDeps, item: Item, audio: Uint8Array): Promise<'stored' | 'exists' | string> {
  const res = await requestWithRetry(deps, 'Supabase upload', () =>
    deps.fetch(`${env.supabaseUrl}/storage/v1/object/${TTS_BUCKET}/${item.path}`, {
      method: 'POST',
      headers: supabaseHeaders(env, {
        'Content-Type': 'audio/mpeg',
        // Content-addressed and never overwritten, so browsers may cache it for a year.
        'cache-control': 'max-age=31536000',
        'x-upsert': 'false',
      }),
      body: audio,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  );
  if (res.ok) return 'stored';
  const body = await shortBody(res);
  if (res.status === 409 || /duplicate|already exists/i.test(body)) return 'exists';
  return `Supabase upload ${res.status} ${body}`;
}

export function formatSummary(summary: RecordSummary): string[] {
  const out = [
    `recorded ${summary.recorded} / skipped (exists) ${summary.skipped} / failed ${summary.failed.length} / characters sent ${summary.charactersSent}`,
  ];
  for (const f of summary.failed) out.push(`  FAILED [${f.source}, ${f.voice}] "${preview(f.text)}": ${f.reason}`);
  if (summary.aborted) out.push(`ABORTED: ${summary.aborted}`);
  return out;
}

async function main(): Promise<void> {
  const deps: RecordDeps = {
    fetch: globalThis.fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    log: (message) => console.log(message),
  };
  let options: RecordOptions;
  let env: RecordEnv | null = null;
  try {
    options = parseArgs(process.argv.slice(2));
    if (!options.dryRun) env = readEnv(process.env);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const summary = await recordVoices(collectLines(), options, env, deps);
  if (options.dryRun) return;
  for (const line of formatSummary(summary)) console.log(line);
  if (summary.failed.length > 0 || summary.aborted) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
