/**
 * The one player for a learner's own recording — "▶ You" in the exam
 * pronunciation report (exam-pronunciation plan §2, report item 2) and in the
 * Pronunciation Lab (pronunciation-lab plan §3, §4: promoted here from
 * features/exam/pronunciation/playClip.ts; the exam imports it back).
 *
 * The recording is decoded locally with Web Audio and either all of it or one
 * window (a word's range plus padding — the exam's buildReport `clipFor`, the
 * Lab's `clipWindow`) is played, optionally slowed (0.75×). Nothing is
 * uploaded, stored or re-encoded. Decoded buffers are cached per blob, so
 * tapping a few words from one answer decodes it once; the cache is weak, so
 * it goes with the blob when its owner drops it. Only one clip sounds at a
 * time: a new play cuts off the current one.
 */

import type { ClipWindow } from '../../../domain/pronunciation/lab/types';

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when this browser can play a clip at all. */
export function canPlayClips(): boolean {
  return audioContextCtor() !== null;
}

let context: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
/** Settles the promise of the clip that is playing now, so a cut-off clip resolves too. */
let settleCurrent: (() => void) | null = null;
const decoded = new WeakMap<Blob, Promise<AudioBuffer>>();

function getContext(): AudioContext | null {
  if (context && context.state !== 'closed') return context;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

function decode(ctx: AudioContext, blob: Blob): Promise<AudioBuffer> {
  let promise = decoded.get(blob);
  if (!promise) {
    promise = blob.arrayBuffer().then((bytes) => ctx.decodeAudioData(bytes));
    promise.catch(() => decoded.delete(blob)); // a failed decode is not cached
    decoded.set(blob, promise);
  }
  return promise;
}

/** Stops whatever clip is playing (its play call resolves). Safe to call when nothing is. */
export function stopClip(): void {
  const source = current;
  const settle = settleCurrent;
  current = null;
  settleCurrent = null;
  if (source) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      // already stopped
    }
  }
  settle?.();
}

export interface PlayClipOptions {
  /** Playback speed, e.g. 0.75 for "slow". Clamped to 0.5–1.5. Default 1. */
  rate?: number;
}

/**
 * Plays `clip` from `blob` (the whole recording when `clip` is null). Resolves
 * true when it played to the end (or was cut off by another clip or
 * `stopClip`), false when playback is unavailable or the audio could not be
 * decoded.
 */
export async function playClip(blob: Blob, clip: ClipWindow | null = null, options: PlayClipOptions = {}): Promise<boolean> {
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = await decode(ctx, blob);
    const startS = clip ? Math.min(Math.max(clip.startS, 0), Math.max(buffer.duration - 0.05, 0)) : 0;
    const durationS = clip ? Math.max(Math.min(clip.endS, buffer.duration) - startS, 0.05) : buffer.duration;
    const rate = Math.min(1.5, Math.max(0.5, options.rate ?? 1));

    stopClip();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(ctx.destination);
    current = source;
    await new Promise<void>((resolve) => {
      settleCurrent = resolve;
      source.onended = () => resolve();
      source.start(0, startS, durationS);
    });
    if (current === source) {
      current = null;
      settleCurrent = null;
    }
    return true;
  } catch {
    return false;
  }
}
