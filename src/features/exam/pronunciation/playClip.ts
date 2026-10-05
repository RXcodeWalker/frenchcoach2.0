/**
 * Exam-mode pronunciation analysis — "▶ You": plays one reported word from the
 * candidate's own in-memory recording (exam-pronunciation plan §2, report
 * item 2).
 *
 * The recording is decoded locally with Web Audio and only the word's range
 * (Azure's in-clip offsets mapped back through the trim map, plus ~120 ms of
 * padding — see buildReport's `clipFor`) is played. Nothing is uploaded,
 * stored or re-encoded. Decoded buffers are cached per blob, so tapping a few
 * words from one answer decodes it once; the cache is weak, so it goes with
 * the blob when the audio store drops it.
 */

import type { PlaybackClip } from '../../../domain/examPronunciation/types';

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

/** Stops whatever clip is playing. Safe to call when nothing is. */
export function stopClip(): void {
  const source = current;
  current = null;
  if (!source) return;
  source.onended = null;
  try {
    source.stop();
  } catch {
    // already stopped
  }
}

/**
 * Plays `clip` from `blob`. Resolves true when it played to the end (or was cut
 * off by another clip), false when playback is unavailable or the audio could
 * not be decoded.
 */
export async function playClip(blob: Blob, clip: PlaybackClip): Promise<boolean> {
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = await decode(ctx, blob);
    const startS = Math.min(Math.max(clip.startS, 0), Math.max(buffer.duration - 0.05, 0));
    const durationS = Math.max(Math.min(clip.endS, buffer.duration) - startS, 0.05);

    stopClip();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    current = source;
    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start(0, startS, durationS);
    });
    if (current === source) current = null;
    return true;
  } catch {
    return false;
  }
}
