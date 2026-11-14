/**
 * playbackControl.ts — pause, resume and restart for every "▶" in the app.
 *
 * The app has three ways of making sound, and only one sounds at a time:
 *  - a recorded Henri line (`services/tts/recordedVoice.ts`, one shared <audio>),
 *  - the browser's speech synthesis (`services/tts/ttsService.ts`),
 *  - the learner's own recording (`features/pronunciation/audio/clipPlayer.ts`).
 *
 * Each of them, while it is sounding, attaches itself here as the current
 * *engine* (`attachEngine`), with a pause/resume/stop. A play button *claims*
 * playback for the length of its play (`claimPlayback` … `releasePlayback`),
 * which may run several engines in a row (▶ Native tries the recording, then
 * the browser voice; the Lab plays "you" then "native"). Pausing pauses
 * whichever engine is current, and an engine that attaches while paused
 * starts paused — so a pause pressed while a line is still loading holds.
 *
 * A new claim stops the current engine first: a paused sound is abandoned,
 * never left half-held (a paused speechSynthesis would otherwise keep every
 * later utterance silent in Chrome).
 *
 * Pure module state, no React — `usePlayControl` is the React side.
 */

export interface PlaybackEngine {
  pause(): void;
  resume(): void;
  stop(): void;
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

let engine: PlaybackEngine | null = null;
let paused = false;
let owner: { id: string; token: number } | null = null;
let tokenSeq = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Called by an engine when it starts sounding. Returns its detach, to call when it stops. */
export function attachEngine(next: PlaybackEngine): () => void {
  engine = next;
  if (paused && owner) next.pause();
  emit();
  return () => {
    if (engine !== next) return;
    engine = null;
    emit();
  };
}

/** A play button starting its play: stops whatever is sounding and makes `id` the owner. */
export function claimPlayback(id: string): number {
  const current = engine;
  engine = null;
  paused = false;
  tokenSeq += 1;
  owner = { id, token: tokenSeq };
  current?.stop();
  emit();
  return tokenSeq;
}

/** The play that claimed `token` has ended (finished, stopped or failed). */
export function releasePlayback(token: number): void {
  if (owner?.token !== token) return;
  owner = null;
  paused = false;
  emit();
}

export function pausePlayback(): void {
  if (!owner || paused) return;
  paused = true;
  engine?.pause();
  emit();
}

export function resumePlayback(): void {
  if (!paused) return;
  paused = false;
  engine?.resume();
  emit();
}

/** Stops the current play outright (its claim is released when its promise settles). */
export function stopPlayback(): void {
  const current = engine;
  engine = null;
  paused = false;
  current?.stop();
  emit();
}

export function playbackStatusFor(id: string): PlaybackStatus {
  if (owner?.id !== id) return 'idle';
  return paused ? 'paused' : 'playing';
}

export function subscribePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam. */
export function resetPlaybackForTests(): void {
  engine = null;
  paused = false;
  owner = null;
  listeners.clear();
}
