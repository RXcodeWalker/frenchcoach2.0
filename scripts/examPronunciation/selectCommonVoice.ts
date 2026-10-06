/**
 * `npm run pronunciation:calibration:select-cv` — picks Common Voice clips for
 * calibration sets 1 (clear) and 2 (accented) and writes a selection file for
 * `prepareCalibration.ts` (exam-pronunciation plan, Batch 7, Decision 5).
 *
 *   npm run pronunciation:calibration:select-cv -- --tsv <extracted>/validated.tsv \
 *     --clips-dir <extracted>/clips --set clear|accented --count 20 --out <selection.json> \
 *     [--accent <regex on the accents column>] [--dataset <name, for provenance>] [--seed 1]
 *
 * Only clips the Common Voice community validated (≥2 up-votes, 0 down-votes)
 * — they were confirmed to be read correctly, so a report on one is a false
 * positive. One clip per speaker, so no single voice dominates a set. Rows with
 * no age, or the `teens` bucket, are skipped: the plan allows no under-13
 * voice and Common Voice's teen bucket cannot rule one out. Sentences need at
 * least 5 words so there is something to assess. Selection is a seeded shuffle,
 * so re-running gives the same clips.
 *
 * `examTranscript` is the sentence the speaker read — an idealised second
 * recogniser (real Web Speech disagrees with Whisper more often, which only
 * suppresses more). Nothing here judges the audio.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? process.argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`missing ${name}`);
  return v;
}

/** mulberry32: a tiny deterministic PRNG for a reproducible pick. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main(): void {
  const tsvPath = resolve(arg('--tsv'));
  const clipsDir = resolve(arg('--clips-dir', join(dirname(tsvPath), 'clips')));
  const set = arg('--set');
  if (set !== 'clear' && set !== 'accented') throw new Error('--set must be clear or accented');
  const count = Number(arg('--count', '20'));
  const accent = new RegExp(arg('--accent', '.*'), 'i');
  const dataset = arg('--dataset', '');
  const outPath = resolve(arg('--out'));
  const random = rng(Number(arg('--seed', '1')));

  const [header, ...rows] = readFileSync(tsvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const cols = header.split('\t');
  const col = (name: string) => {
    const i = cols.indexOf(name);
    if (i < 0) throw new Error(`${tsvPath} has no "${name}" column (has: ${cols.join(', ')})`);
    return i;
  };
  const [cClient, cPath, cSentence, cUp, cDown, cAge, cAccents] =
    ['client_id', 'path', 'sentence', 'up_votes', 'down_votes', 'age', 'accents'].map(col);

  const candidates = rows
    .map((r) => r.split('\t'))
    .filter((f) => Number(f[cUp]) >= 2 && Number(f[cDown]) === 0)
    .filter((f) => f[cAge] && f[cAge] !== 'teens')
    .filter((f) => f[cSentence].trim().split(/\s+/).length >= 5)
    .filter((f) => accent.test(f[cAccents] ?? ''))
    .filter((f) => existsSync(join(clipsDir, f[cPath])));

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const speakers = new Set<string>();
  const picked = candidates.filter((f) => !speakers.has(f[cClient]) && speakers.add(f[cClient])).slice(0, count);

  const clips = picked.map((f) => ({
    clipId: `cv-${set}-${f[cPath].replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]/g, '_')}`,
    set,
    audioPath: relative(dirname(outPath), join(clipsDir, f[cPath])),
    examTranscript: f[cSentence].trim(),
    recognizer: 'webspeech',
    source: { corpus: 'common-voice', dataset, license: 'CC0-1.0', path: f[cPath], accents: f[cAccents] ?? '', age: f[cAge] },
    knownMisreadings: [],
  }));
  writeFileSync(outPath, JSON.stringify({ clips }, null, 2) + '\n');
  console.log(`${clips.length}/${count} ${set} clips from ${candidates.length} eligible rows (${speakers.size} speakers seen) → ${outPath}`);
  if (clips.length < count) console.warn('fewer clips than asked: widen --accent or use a larger release');
}

main();
