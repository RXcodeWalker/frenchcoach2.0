/**
 * The kid-friendly end-of-speech rule (junior-track §4). `useRecording` runs Web
 * Speech in `continuous` mode and only stops when told to, so Junior stops a
 * capture itself from the mic level (`useMicLevel`'s smoothed 0–1 `levelRef`):
 *
 *  - once the kid has started speaking, about END_SILENCE_MS of quiet ends it
 *    (children pause mid-sentence, so this is longer than an adult default);
 *  - HARD_LIMIT_MS ends it whatever happens, so a turn can never run on.
 *
 * Both constants live in this one file, UNVALIDATED: they are tuned at the
 * playtest (junior-track "Playtest gate"), and the spec does not restate them.
 * Pure: the caller feeds in the level and the clock.
 */
import { MIC_SOUND_LEVEL } from './warmup';

/** Quiet after speech has started that ends the capture. UNVALIDATED: tune at the playtest. */
export const END_SILENCE_MS = 2500;

/** The longest one capture may run. UNVALIDATED: tune at the playtest. */
export const HARD_LIMIT_MS = 12000;

export interface CaptureWatch {
  startedAt: number;
  /** The level reached MIC_SOUND_LEVEL at least once. */
  speechStarted: boolean;
  /** Last time the level was at or above MIC_SOUND_LEVEL. */
  lastSoundAt: number;
  /** Highest level seen (0–1). Feeds the warm-up decision and the silence rule. */
  peak: number;
}

export function startCaptureWatch(now: number): CaptureWatch {
  return { startedAt: now, speechStarted: false, lastSoundAt: now, peak: 0 };
}

export type CaptureTick = { watch: CaptureWatch; stop: 'continue' | 'silence' | 'limit' };

/** One look at the mic: update the watch and say whether the capture should end now. */
export function tickCapture(watch: CaptureWatch, level: number, now: number): CaptureTick {
  const heard = level >= MIC_SOUND_LEVEL;
  const next: CaptureWatch = {
    ...watch,
    peak: Math.max(watch.peak, level),
    speechStarted: watch.speechStarted || heard,
    lastSoundAt: heard ? now : watch.lastSoundAt,
  };
  if (now - next.startedAt >= HARD_LIMIT_MS) return { watch: next, stop: 'limit' };
  if (next.speechStarted && now - next.lastSoundAt >= END_SILENCE_MS) return { watch: next, stop: 'silence' };
  return { watch: next, stop: 'continue' };
}
