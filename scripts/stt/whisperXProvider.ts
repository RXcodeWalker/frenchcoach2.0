/**
 * S3 impure adapter: spawns the whisperX Python sidecar and normalises its stdout
 * JSON into RawAsrResult. Node-only I/O — lives outside src/ so it never enters
 * tsconfig.app.json's typecheck (see scripts/README via tsconfig.scripts.json).
 */

import { spawn } from 'node:child_process';
import { parseRawAsrResult } from '../../src/domain/igcse/stt/schema';
import type {
  TranscriptionInput,
  TranscriptionProvider,
} from '../../src/domain/igcse/stt/ports';
import type { RawAsrResult } from '../../src/domain/igcse/stt/types';

export interface WhisperXProviderOptions {
  pythonPath?: string;
  sidecarPath: string;
  hfToken: string;
  modelVersion?: string;
}

function runSidecar(options: WhisperXProviderOptions, audioPath: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [
      options.sidecarPath,
      '--audio',
      audioPath,
      '--hf-token',
      options.hfToken,
      ...(options.modelVersion ? ['--model', options.modelVersion] : []),
    ];

    const child = spawn(options.pythonPath ?? 'python', args);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
      process.stderr.write(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`whisperX sidecar exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`whisperX sidecar produced invalid JSON on stdout: ${String(err)}`));
      }
    });
  });
}

export function createWhisperXProvider(options: WhisperXProviderOptions): TranscriptionProvider {
  return {
    id: 'whisperx-large-v3',
    modelVersion: options.modelVersion ?? 'large-v3',
    async transcribe(input: TranscriptionInput): Promise<RawAsrResult> {
      const raw = await runSidecar(options, input.audioPath);
      // _decodeParams is forensic-only (goes into raw-asr.json by the CLI), not
      // part of the RawAsrResult contract — strip it before validating.
      const { _decodeParams: _unused, ...contractShape } = raw as Record<string, unknown>;
      void _unused;
      return parseRawAsrResult(contractShape);
    },
  };
}
