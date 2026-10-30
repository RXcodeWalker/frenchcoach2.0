/**
 * `npm run lab:calibration:prepare -- --audio <folder> --out <manifest.json>` —
 * lists the recordings in a folder (named as the sheet says) and writes the
 * manifest `backend/scripts/probe_lab_calibration.py` reads. Nothing is
 * decoded or uploaded here; nothing is committed anywhere.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { buildManifest, isAudioFile, type AudioFile } from './plan';

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) {
    console.error(`missing ${name}`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

const audioDir = resolve(arg('--audio'));
const out = resolve(arg('--out'));
const files: AudioFile[] = readdirSync(audioDir)
  .filter(isAudioFile)
  .map((name) => {
    const sidecar = join(audioDir, `${basename(name, extname(name))}.txt`);
    return {
      name,
      path: relative(dirname(out), join(audioDir, name)).split('\\').join('/'),
      sidecarText: existsSync(sidecar) ? readFileSync(sidecar, 'utf8') : null,
    };
  });

const { manifest, unrecognised, missingDetection, problems } = buildManifest(files);
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);

const bySpeaker = new Map<string, number>();
for (const c of manifest.clips) bySpeaker.set(c.speaker, (bySpeaker.get(c.speaker) ?? 0) + 1);
console.log(`wrote ${out}: ${manifest.clips.length} clips`);
for (const [speaker, n] of bySpeaker) console.log(`  ${speaker}: ${n}`);
if (missingDetection.length) console.log(`missing from your own set (${missingDetection.length}): ${missingDetection.join(' ')}`);
if (unrecognised.length) console.log(`not recognised, left out (${unrecognised.length}): ${unrecognised.join(' ')}`);
for (const p of problems) console.error(`problem: ${p}`);
process.exit(problems.length ? 1 : 0);
