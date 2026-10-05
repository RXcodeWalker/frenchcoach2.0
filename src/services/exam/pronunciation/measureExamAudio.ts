/**
 * Exam-mode pronunciation analysis, Batch 3 — measure only. After an exam ends,
 * decode each stored turn recording, trim its silence, and report how long it
 * was before and after (`exam_pronunciation_audio_measured`).
 *
 * Dark by design: no request leaves the browser, nothing is shown, nothing is
 * stored, and the stored blobs are left exactly as they were. It never throws —
 * measurement is best-effort telemetry and must not be able to disturb the
 * results screen or scoring. It does not read or influence the transcript,
 * the ConductLog or any mark.
 *
 * Turns are processed one at a time: a decode of a long answer can transiently
 * hold tens of MB of Float32, so they must not overlap.
 */

import {
  normalizeToWav16kMono,
  AudioTooShortError,
  AudioTooLongError,
} from '../../../domain/pronunciation/audioNormalizer';
import { segmentSpeechTurns, PRONUNCIATION_PARTS } from '../../../domain/examPronunciation/segment';
import { trimSilence } from '../../../domain/examPronunciation/trim';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { SessionPart } from '../../../domain/igcse/stt/types';
import { track } from '../../telemetry/telemetryService';
import { getTurnAudio } from './examAudioStore';

/**
 * Longest single exam turn accepted. Learn's 60 s cap is too tight for a long
 * topic answer; the backend chunks past Azure's 30 s request limit (plan §3b),
 * so the client only needs a ceiling that bounds transient decode memory
 * (~70 MB of Float32 at 48 kHz stereo for 180 s).
 */
export const EXAM_TURN_MAX_SECONDS = 180;

export type AudioMeasureStatus =
  | 'measured'
  | 'no_audio'
  | 'no_speech'
  | 'too_short'
  | 'too_long'
  | 'decode_failed';

export interface TurnAudioMeasurement {
  sessionId: string;
  part: SessionPart;
  turnKey: number;
  status: AudioMeasureStatus;
  rawS: number | null;
  trimmedS: number | null;
}

/** Reads the samples back out of the canonical 44-byte-header 16-bit mono WAV that `normalizeToWav16kMono` writes. */
export async function readWavPcm16Mono(wav: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const buffer = await wav.arrayBuffer();
  const view = new DataView(buffer);
  const sampleRate = view.getUint32(24, true);
  const count = Math.floor((buffer.byteLength - 44) / 2);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) samples[i] = view.getInt16(44 + i * 2, true) / 0x8000;
  return { samples, sampleRate };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

async function measureTurn(
  sessionId: string,
  part: SessionPart,
  turnKey: number,
): Promise<TurnAudioMeasurement> {
  const base = { sessionId, part, turnKey };
  const blob = getTurnAudio(sessionId, turnKey);
  if (!blob) return { ...base, status: 'no_audio', rawS: null, trimmedS: null };

  try {
    const normalized = await normalizeToWav16kMono(blob, { maxSeconds: EXAM_TURN_MAX_SECONDS });
    const { samples, sampleRate } = await readWavPcm16Mono(normalized.blob);
    const trimmed = trimSilence(samples, sampleRate);
    return {
      ...base,
      status: trimmed.hasSpeech ? 'measured' : 'no_speech',
      rawS: round1(trimmed.rawS),
      trimmedS: round1(trimmed.trimmedS),
    };
  } catch (err) {
    if (err instanceof AudioTooShortError) return { ...base, status: 'too_short', rawS: null, trimmedS: null };
    if (err instanceof AudioTooLongError) return { ...base, status: 'too_long', rawS: null, trimmedS: null };
    return { ...base, status: 'decode_failed', rawS: null, trimmedS: null };
  }
}

/**
 * Measures every candidate speech turn in `entries` (typed, repeat and
 * non-answer turns are excluded by `segmentSpeechTurns`) and emits one
 * telemetry event each. Resolves with the measurements; never rejects.
 */
export async function measureExamAudio(
  sessionId: string,
  entries: readonly ConductLogEntry[],
): Promise<TurnAudioMeasurement[]> {
  const results: TurnAudioMeasurement[] = [];
  try {
    const byPart = segmentSpeechTurns(entries);
    for (const part of PRONUNCIATION_PARTS) {
      for (const turn of byPart[part]) {
        const m = await measureTurn(sessionId, part, turn.turnKey);
        results.push(m);
        track({
          name: 'exam_pronunciation_audio_measured',
          props: {
            session_id: sessionId,
            part,
            turn_key: turn.turnKey,
            status: m.status,
            raw_s: m.rawS,
            trimmed_s: m.trimmedS,
          },
        });
      }
    }
  } catch {
    // Telemetry only — never let a measurement problem surface to the candidate.
  }
  return results;
}
