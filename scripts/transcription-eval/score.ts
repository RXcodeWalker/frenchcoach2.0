/**
 * Step-0 scorer: WER (one normaliser), hallucinations, filler retention,
 * latency p50/p95, and the verdict from the pre-declared decision rule.
 *
 *   npm run transcribe:eval-score -- [--dir data/transcription-eval]
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildReport, formatReport } from './report';
import type { DecisionRule, Manifest, ResultsFile } from './types';

async function main(): Promise<void> {
  const i = process.argv.indexOf('--dir');
  const dir = path.resolve(i === -1 ? 'data/transcription-eval' : process.argv[i + 1]);

  const ruleRaw = await fs.readFile(path.join(import.meta.dirname, 'decision-rule.json'), 'utf8');
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const results = JSON.parse(await fs.readFile(path.join(dir, 'results.json'), 'utf8')) as ResultsFile;

  const hash = crypto.createHash('sha256').update(ruleRaw).digest('hex');
  if (hash !== results.ruleHash) {
    throw new Error('decision-rule.json changed after the run: the rule must be declared before running. Re-run.');
  }

  const report = buildReport(manifest, results, JSON.parse(ruleRaw) as DecisionRule);
  const text = formatReport(report);
  console.log(text);
  await fs.writeFile(path.join(dir, 'report.md'), text);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
