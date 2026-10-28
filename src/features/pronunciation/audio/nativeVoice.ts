/**
 * "▶ Native" for the Pronunciation Lab (pronunciation-lab plan §4, §4.2):
 * a word or sentence is played from
 *
 *   1. its recorded Azure Neural file (`voiceKey.ts`'s path, via
 *      `recordedVoice.ts` — never Azure at play time), when recorded voices
 *      are on and the file exists;
 *   2. else a real French browser voice;
 *   3. else nothing — `'unavailable'`, and the UI says "Native audio isn't
 *      available on this device". An English voice never reads French.
 *
 * `text` may be a list of candidates, tried in order for a recording (a word
 * that is part of a liaison passes the two-word group first, then the word);
 * the browser voice reads the first candidate. Recordings exist only for
 * static authored French that the catalogue (`scripts/tts/collectLines.ts`)
 * lists (Stage 4 added the Lab's lines). A missing file is remembered, so it
 * is asked for once per session.
 *
 * An AI-corrected sentence is never in that catalogue. A caller playing one
 * passes `synthesize: true` (Stage 4b, owner D2): when no candidate has a
 * file, the backend is asked once to record the first candidate into the same
 * bucket (`services/tts/sentenceVoice.ts`, metered there), and the new file is
 * played; any refusal or failure falls through to the browser voice as before.
 * Words never opt in — they come from the recorded lexicon.
 *
 * One sound at a time: playing Native stops "▶ You" (`clipPlayer`) and any
 * other speech; `stopNative()` cuts Native off (its call resolves `'stopped'`).
 */

import {
  forgetMissingRecording,
  primeRecordedAudio,
  playRecorded,
  recordedVoicesEnabled,
} from '../../../services/tts/recordedVoice';
import { requestSentenceRecording } from '../../../services/tts/sentenceVoice';
import { TTS } from '../../../services/tts/ttsService';
import { stopClip } from './clipPlayer';

export type NativePlayResult = 'recorded' | 'browser' | 'unavailable' | 'stopped';

export interface PlayNativeOptions {
  /** 1 = normal, 0.75 = slow. Relative to the app's normal speaking rate. */
  speed?: number;
  /** An AI-written sentence: with no recording, ask the backend to record it (Stage 4b). */
  synthesize?: boolean;
  /** Called when the backend is being asked to record it (the play is then a second or two late). */
  onPreparing?: () => void;
}

/** `ttsService`'s normal browser rate; `recordedVoice` maps rates relative to it. */
const NORMAL_RATE = 0.9;

let generation = 0;

/** Cuts off Native audio; a `playNative` in progress resolves `'stopped'`. */
export function stopNative(): void {
  generation += 1;
  TTS.stop();
}

/** True when this device can play Native audio for some text (a recording or a French voice). */
export function canPlayNative(): boolean {
  return TTS.canSpeakFrench(true);
}

/** Plays `text` (or the first candidate that has a recording) as Native audio. Never rejects. */
export async function playNative(text: string | readonly string[], options: PlayNativeOptions = {}): Promise<NativePlayResult> {
  const candidates = (typeof text === 'string' ? [text] : [...text]).map((t) => t.trim()).filter(Boolean);
  if (candidates.length === 0) return 'unavailable';
  stopClip();
  stopNative();
  const mine = generation;
  const rate = NORMAL_RATE * Math.min(1, Math.max(0.5, options.speed ?? 1));

  if (recordedVoicesEnabled()) {
    primeRecordedAudio();
    for (const candidate of candidates) {
      const result = await playRecorded(candidate, { rate });
      if (mine !== generation) return 'stopped';
      if (result === 'played') return 'recorded';
      if (result === 'stopped') return 'stopped';
    }
    if (options.synthesize) {
      options.onPreparing?.();
      const ready = await requestSentenceRecording(candidates[0]);
      if (mine !== generation) return 'stopped';
      if (ready) {
        await forgetMissingRecording(candidates[0]);
        const result = await playRecorded(candidates[0], { rate });
        if (mine !== generation) return 'stopped';
        if (result === 'played') return 'recorded';
        if (result === 'stopped') return 'stopped';
      }
    }
  }

  try {
    await TTS.ensureVoiceReady();
  } catch {
    return 'unavailable';
  }
  if (mine !== generation) return 'stopped';
  if (!TTS.isSupported() || !TTS.hasFrenchVoice()) return 'unavailable';
  try {
    await TTS.speak(candidates[0], { rate });
  } catch {
    return 'unavailable';
  }
  return mine === generation ? 'browser' : 'stopped';
}
