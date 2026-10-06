/**
 * `npm run pronunciation:calibration:prepare` — turns the selected calibration
 * clips into the trimmed 16 kHz mono WAVs and manifest that
 * `backend/scripts/probe_exam_pronunciation.py` sends to Whisper and Azure
 * (exam-pronunciation plan, Batch 7).
 *
 *   npm run pronunciation:calibration:prepare -- --clips <selection.json> --out <dir>
 *
 * `selection.json`: { "clips": [{ clipId, set: clear|accented|unclear,
 * reading?: correct|swap, audioPath (relative to the selection file),
 * examTranscript, recognizer?: webspeech|whisper, source, expectedReported?,
 * knownMisreadings? }] }.
 *
 * Decoding and resampling use ffmpeg (the browser uses an OfflineAudioContext,
 * which Node lacks — the one step that differs from a real exam turn). From
 * the decoded PCM on, every clip goes through `prepareDecodedTurn`, the same
 * function the exam client uses: clipping measured and pauses taken on the
 * untrimmed audio, then silence trimmed. Clips outside the client's 0.4 s –
 * EXAM_TURN_MAX_SECONDS range, or with no speech, are reported and left out,
 * as the client would.
 *
 * The audio is CC0 (Common Voice) or the owner's own recording; neither the
 * source clips nor the prepared WAVs are committed anywhere.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { EXAM_PRONUNCIATION_VERSION } from '../../src/domain/examPronunciation/version';
import { prepareDecodedTurn } from '../../src/services/exam/pronunciation/prepareDecodedTurn';
import { CALIBRATION_SETS, type CalibrationSet } from './calibration';

const SAMPLE_RATE = 16_000;
const MIN_SECONDS = 0.4; // audioNormalizer.ts's floor
const MAX_SECONDS = 180; // EXAM_TURN_MAX_SECONDS

interface SelectedClip {
  clipId: string;
  set: CalibrationSet;
  reading?: 'correct' | 'swap';
  audioPath: string;
  examTranscript: string;
  recognizer?: 'webspeech' | 'whisper';
  source: unknown;
  expectedReported?: string[];
  knownMisreadings?: string[];
}

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`missing ${name}`);
  return process.argv[i + 1];
}

function decode(path: string): Float32Array {
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-'],
    { maxBuffer: 1024 * 1024 * 64 },
  );
  const samples = new Float32Array(Math.floor(pcm.length / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = pcm.readInt16LE(i * 2) / 0x8000;
  return samples;
}

async function main(): Promise<void> {
  const selectionPath = resolve(arg('--clips'));
  const outDir = resolve(arg('--out'));
  const { clips } = JSON.parse(readFileSync(selectionPath, 'utf8')) as { clips: SelectedClip[] };
  mkdirSync(join(outDir, 'wav'), { recursive: true });

  const ids = new Set<string>();
  const manifest = [];
  for (const clip of clips) {
    if (!CALIBRATION_SETS.includes(clip.set)) throw new Error(`${clip.clipId}: unknown set ${clip.set}`);
    if (!/^[A-Za-z0-9._-]+$/.test(clip.clipId) || ids.has(clip.clipId)) throw new Error(`bad or duplicate clipId ${clip.clipId}`);
    if (clip.set === 'unclear' && clip.reading !== 'correct' && clip.reading !== 'swap') {
      throw new Error(`${clip.clipId}: an unclear clip needs reading correct|swap`);
    }
    if (clip.reading === 'swap' && !clip.expectedReported?.length) throw new Error(`${clip.clipId}: a swap reading needs expectedReported`);
    ids.add(clip.clipId);

    const samples = decode(resolve(dirname(selectionPath), clip.audioPath));
    const seconds = samples.length / SAMPLE_RATE;
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
      console.warn(`skipped ${clip.clipId}: ${seconds.toFixed(2)} s is outside ${MIN_SECONDS}–${MAX_SECONDS} s`);
      continue;
    }
    const prepared = prepareDecodedTurn(samples, SAMPLE_RATE);
    if (!prepared) {
      console.warn(`skipped ${clip.clipId}: no speech cleared the trim gate`);
      continue;
    }
    const wavPath = join('wav', `${clip.clipId}.wav`);
    const wav = Buffer.from(await prepared.wav.arrayBuffer());
    writeFileSync(join(outDir, wavPath), wav);
    manifest.push({
      clipId: clip.clipId,
      set: clip.set,
      reading: clip.reading ?? null,
      source: clip.source,
      recognizer: clip.recognizer ?? 'webspeech',
      examTranscript: clip.examTranscript,
      expectedReported: clip.expectedReported ?? [],
      knownMisreadings: clip.knownMisreadings ?? [],
      wavPath,
      rawS: prepared.rawS,
      trimmedS: Math.round(((wav.length - 44) / 2 / SAMPLE_RATE) * 1000) / 1000,
      pausesOver2s: prepared.pausesOver2s,
      longestPauseS: prepared.longestPauseS,
      clippedRatio: prepared.clippedRatio,
    });
  }

  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify({ fairnessVersion: EXAM_PRONUNCIATION_VERSION, preparedAt: new Date().toISOString(), clips: manifest }, null, 2) + '\n',
  );
  const trimmed = manifest.reduce((n, c) => n + c.trimmedS, 0);
  console.log(`prepared ${manifest.length}/${clips.length} clips, ${trimmed.toFixed(1)} s of audio to send → ${join(outDir, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
