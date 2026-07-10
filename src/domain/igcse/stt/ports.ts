/**
 * S3 STT ports — the only two places this subphase touches the outside world.
 * Mirrors the injected-Judge-port convention in judgement/types.ts.
 */

import type { RawAsrResult, SessionTranscript } from './types';

export interface TranscriptionInput {
  audioPath: string;
  /** Literal — not a parameter, a constraint. */
  languageCode: 'fr';
  diarize: boolean;
  expectedSpeakers: 2;
}

export interface TranscriptionProvider {
  /** 'whisperx-large-v3' | 'fixture' */
  readonly id: string;
  readonly modelVersion: string;
  transcribe(input: TranscriptionInput): Promise<RawAsrResult>;
}

export interface TranscriptStore {
  save(t: SessionTranscript): Promise<void>;
  load(sessionId: string): Promise<SessionTranscript>;
  list(): Promise<string[]>;
}
