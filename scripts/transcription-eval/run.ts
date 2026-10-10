/**
 * Step-0 runner: sends every clip through each Groq Whisper config and records
 * text + latency. Offline tooling only — talks to Groq directly with
 * GROQ_API_KEY, never through the app backend, and writes nothing outside the
 * data directory.
 *
 *   GROQ_API_KEY=... npm run transcribe:eval-run -- [--dir data/transcription-eval] [--runs 3]
 *
 * `--runs` repeats each request to get a usable p95 from ~15 clips; the text
 * used for scoring is the first run's.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CONFIGS, type ConfigDef, type DecisionRule, type Manifest, type ResultsFile, type RunResult } from './types';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

async function transcribe(
  audio: Buffer,
  fileName: string,
  config: ConfigDef,
  prompt: string | undefined,
  key: string,
): Promise<{ text: string; latencyMs: number }> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)]), fileName);
  form.append('model', config.model);
  form.append('language', 'fr');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (config.usePrompt && prompt) form.append('prompt', prompt);
  const started = performance.now();
  const res = await fetch(GROQ_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  const latencyMs = performance.now() - started;
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string };
  return { text: (json.text ?? '').trim(), latencyMs };
}

async function main(): Promise<void> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Set GROQ_API_KEY.');
  const dir = path.resolve(arg('dir', 'data/transcription-eval'));
  const runs = Math.max(1, Number(arg('runs', '3')));

  const ruleRaw = await fs.readFile(path.join(import.meta.dirname, 'decision-rule.json'), 'utf8');
  const rule = JSON.parse(ruleRaw) as DecisionRule;
  if (
    rule.minWerImprovementOverChrome === null ||
    rule.minAccentMarginForLargeV3 === null ||
    rule.maxP95LatencyMs === null
  ) {
    throw new Error('Declare the thresholds in scripts/transcription-eval/decision-rule.json BEFORE running.');
  }

  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const results: RunResult[] = [];
  for (const clip of manifest.clips) {
    const audio = await fs.readFile(path.join(dir, clip.file));
    for (const config of CONFIGS) {
      const result: RunResult = { clipId: clip.id, config: config.id, text: '', latenciesMs: [] };
      try {
        for (let n = 0; n < runs; n++) {
          const r = await transcribe(audio, path.basename(clip.file), config, clip.promptHint, key);
          if (n === 0) result.text = r.text;
          result.latenciesMs.push(r.latencyMs);
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
      }
      results.push(result);
      console.log(`${clip.id} ${config.id}: ${result.error ? `ERROR ${result.error}` : result.text.slice(0, 70)}`);
    }
  }

  const out: ResultsFile = {
    ruleHash: crypto.createHash('sha256').update(ruleRaw).digest('hex'),
    ranAt: new Date().toISOString(),
    results,
  };
  await fs.writeFile(path.join(dir, 'results.json'), JSON.stringify(out, null, 2));
  console.log(`\nWrote ${path.join(dir, 'results.json')}. Now: npm run transcribe:eval-score`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
