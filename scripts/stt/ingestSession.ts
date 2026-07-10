/**
 * S3 CLI: parse args, wire provider + store, run the assembler, print warnings.
 *
 * Usage:
 *   npm run stt:ingest -- --session <id> --provider whisperx|fixture [--hf-token <token>]
 *
 * Reads data/sessions/<id>/audio.wav + questions.json, writes raw-asr.json and
 * transcript.json into the same directory.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { assembleSession } from '../../src/domain/igcse/stt/assemble/assembleSession';
import { createFileTranscriptStore } from './fileTranscriptStore';
import { createWhisperXProvider } from './whisperXProvider';
import { createFixtureProvider } from '../../src/domain/igcse/stt/providers/fixtureProvider';
import type { TranscriptionProvider } from '../../src/domain/igcse/stt/ports';
import type { ContentProvenance, RawAsrResult, SessionQuestionSet } from '../../src/domain/igcse/stt/types';

const SESSIONS_ROOT = path.join(process.cwd(), 'data', 'sessions');

interface CliArgs {
  session: string;
  provider: 'whisperx' | 'fixture';
  hfToken?: string;
  contentProvenance: ContentProvenance;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };

  const session = get('--session');
  const provider = get('--provider') ?? 'whisperx';
  if (!session) {
    throw new Error('Usage: stt:ingest -- --session <id> --provider whisperx|fixture');
  }
  if (provider !== 'whisperx' && provider !== 'fixture') {
    throw new Error(`Unknown --provider "${provider}"; expected whisperx|fixture`);
  }

  return {
    session,
    provider,
    hfToken: get('--hf-token') ?? process.env.HF_TOKEN,
    contentProvenance: (get('--provenance') as ContentProvenance | undefined) ?? 'confidential-internal',
  };
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function canonicalize(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

async function loadQuestionSet(sessionDir: string): Promise<SessionQuestionSet> {
  const raw = await fs.readFile(path.join(sessionDir, 'questions.json'), 'utf8');
  return JSON.parse(raw) as SessionQuestionSet;
}

function resolveProvider(args: CliArgs, fixtureResult?: RawAsrResult): TranscriptionProvider {
  if (args.provider === 'fixture') {
    if (!fixtureResult) {
      throw new Error('--provider fixture requires a canned RawAsrResult; wire one in for smoke testing');
    }
    return createFixtureProvider(fixtureResult);
  }
  if (!args.hfToken) {
    throw new Error('--provider whisperx requires --hf-token or HF_TOKEN env var (pyannote diarization)');
  }
  return createWhisperXProvider({
    sidecarPath: path.join(process.cwd(), 'scripts', 'stt', 'sidecar', 'transcribe.py'),
    hfToken: args.hfToken,
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sessionDir = path.join(SESSIONS_ROOT, args.session);

  const questionSet = await loadQuestionSet(sessionDir);
  const audioPath = path.join(sessionDir, 'audio.wav');
  const audioBuffer = await fs.readFile(audioPath);

  const provider = resolveProvider(args);
  const raw = await provider.transcribe({
    audioPath,
    languageCode: 'fr',
    diarize: true,
    expectedSpeakers: 2,
  });

  await fs.writeFile(path.join(sessionDir, 'raw-asr.json'), JSON.stringify(raw, null, 2) + '\n', 'utf8');

  const transcript = assembleSession(raw, questionSet, {
    sessionId: args.session,
    contentProvenance: args.contentProvenance,
    recordedAt: new Date().toISOString(),
    audio: {
      sha256: sha256(audioBuffer),
      durationS: raw.words.length > 0 ? raw.words[raw.words.length - 1].endS : 0,
      sampleRateHz: 16000,
      channels: 1,
    },
    questionSetHash: sha256(Buffer.from(canonicalize(questionSet), 'utf8')),
    annotationSource: 'asr-annotation',
  });

  if (transcript.roleLabelConfidence < 0.3) {
    console.warn(
      `WARNING: roleLabelConfidence is low (${transcript.roleLabelConfidence.toFixed(2)}) — ` +
        'examiner/candidate role assignment may be wrong. Spot-check before trusting this transcript.',
    );
  }

  const store = createFileTranscriptStore(SESSIONS_ROOT);
  await store.save(transcript);

  console.log(`Wrote ${path.join(sessionDir, 'transcript.json')}`);
  console.log(
    `Utterances: ${transcript.utterances.length}, examinerEvents: ${transcript.examinerEvents.length}, ` +
      `roleLabelConfidence: ${transcript.roleLabelConfidence.toFixed(2)}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
