/**
 * recordedVoice.ts — plays the pre-recorded Azure Neural MP3s (recorded-voices
 * plan §6.1). Never calls Azure: a line is played from the public Supabase
 * bucket or reported `'missing'`, and the caller decides on a fallback.
 *
 * One shared `HTMLAudioElement` for the whole app, so only one recording
 * sounds at a time: a new `playRecorded` or `stopRecorded()` cuts off the
 * current one, which resolves `'stopped'`. Paths are built only by
 * `voiceKey.ts`, the module the recording script uses.
 */
import { recordedVoiceUrl, voiceObjectPath, type RecordedVoiceId } from './voiceKey';

/** The voice every recorded line is played in (Henri only, owner decision 2026-10-24). */
export const DEFAULT_RECORDED_VOICE: RecordedVoiceId = 'henri';

export type RecordedPlayResult = 'played' | 'missing' | 'stopped';

/** `ttsService`'s default browser rate: a caller's `rate` is relative to it. */
const BROWSER_DEFAULT_RATE = 0.9;
/** No `playing` event within this long ⇒ treat the file as missing. */
const START_TIMEOUT_MS = 3000;
/** Extra time past the file's length before a stalled playback is ended anyway (it must never hang an exam turn). */
const STALL_GRACE_MS = 4000;
/** 0.1 s of silence (22 kHz mono MP3), played once inside a user gesture to unlock iOS Safari. */
const SILENT_MP3 = 'data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEWwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

export function recordedVoicesEnabled(): boolean {
  return import.meta.env.VITE_RECORDED_VOICES === '1' && Boolean(import.meta.env.VITE_SUPABASE_URL);
}

/** Built URLs, so a replay or repeat doesn't re-hash its line. */
const urlCache = new Map<string, string>();

/** The URL the app plays `text` from (null without a Supabase URL). */
export async function recordedLineUrl(text: string, voice: RecordedVoiceId = DEFAULT_RECORDED_VOICE): Promise<string | null> {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) return null;
  const cacheKey = `${base}|${voice}|${text}`;
  const cached = urlCache.get(cacheKey);
  if (cached) return cached;
  const url = recordedVoiceUrl(base, await voiceObjectPath(text, voice));
  urlCache.set(cacheKey, url);
  return url;
}

/** `audio.playbackRate` for a browser-voice `rate`: 0.6 (Shadowing's slow) ⇒ ≈0.67; never faster than the recording. */
export function recordedPlaybackRate(rate?: number): number {
  if (!rate) return 1;
  return Math.min(1, Math.max(0.5, rate / BROWSER_DEFAULT_RATE));
}

/** URLs that 404'd, errored or never started this session: later calls skip straight to `'missing'`. */
const missing = new Set<string>();
let audio: HTMLAudioElement | null = null;
let primed = false;
/** Bumped by every new play and every stop, so a call still building its URL knows it was superseded. */
let epoch = 0;
/** Ends the recording that is playing now, if any. */
let cutOffCurrent: (() => void) | null = null;

function sharedAudio(): HTMLAudioElement | null {
  if (audio) return audio;
  if (typeof Audio === 'undefined') return null;
  audio = new Audio();
  audio.preload = 'auto';
  return audio;
}

export interface PlayRecordedOptions {
  /** A browser-voice rate (0.9 = normal); mapped by `recordedPlaybackRate`. */
  rate?: number;
  voice?: RecordedVoiceId;
  /** Called when the recording actually starts sounding. */
  onStart?: () => void;
  /** Called once when a recording that started stops sounding (ended, cut off or failed). */
  onEnd?: () => void;
}

/** Cuts off the current recording (it resolves `'stopped'`) and drops a call still building its URL. */
export function stopRecorded(): void {
  epoch += 1;
  cutOffCurrent?.();
}

/**
 * Plays `text`'s recording. Resolves `'played'` when it ends, `'missing'` when
 * there is no playable file (or autoplay was refused), `'stopped'` when cut
 * off. Never rejects.
 */
export async function playRecorded(text: string, options: PlayRecordedOptions = {}): Promise<RecordedPlayResult> {
  stopRecorded();
  const myEpoch = epoch;

  let url: string | null;
  try {
    url = await recordedLineUrl(text, options.voice ?? DEFAULT_RECORDED_VOICE);
  } catch {
    return 'missing';
  }
  if (myEpoch !== epoch) return 'stopped';
  if (!url || missing.has(url)) return 'missing';
  const el = sharedAudio();
  if (!el) return 'missing';
  const src = url;

  return new Promise<RecordedPlayResult>((resolve) => {
    let started = false;
    let done = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: RecordedPlayResult, markMissing = false) => {
      if (done) return;
      done = true;
      if (startTimer) clearTimeout(startTimer);
      if (stallTimer) clearTimeout(stallTimer);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
      if (cutOffCurrent === cutOff) cutOffCurrent = null;
      // Also cancels a play() still waiting on the network, so a late file can't start over a fallback voice.
      el.pause();
      if (markMissing) missing.add(src);
      if (started) options.onEnd?.();
      resolve(result);
    };
    const onPlaying = () => {
      if (started) return;
      started = true;
      if (startTimer) clearTimeout(startTimer);
      const seconds = el.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        stallTimer = setTimeout(() => finish('played'), (seconds / (el.playbackRate || 1)) * 1000 + STALL_GRACE_MS);
      }
      options.onStart?.();
    };
    const onEnded = () => finish('played');
    const onError = () => finish('missing', true);
    const cutOff = () => finish('stopped');

    cutOffCurrent = cutOff;
    el.addEventListener('playing', onPlaying);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    startTimer = setTimeout(() => finish('missing', true), START_TIMEOUT_MS);

    try {
      el.src = src;
      el.playbackRate = recordedPlaybackRate(options.rate);
      el.preservesPitch = true;
      Promise.resolve(el.play()).catch((err: unknown) => {
        const name = (err as { name?: string } | null)?.name;
        // Autoplay refused: the file is fine, so don't remember it as missing.
        if (name === 'NotAllowedError') finish('missing');
        // AbortError: our own pause()/src change cut it off; that path already settled.
        else if (name !== 'AbortError') finish('missing', true);
      });
    } catch {
      finish('missing', true);
    }
  });
}

/**
 * Unlocks audio on iOS Safari: call inside a user gesture. Plays a tiny silent
 * clip on the shared element, once. Best-effort, never throws.
 */
export function primeRecordedAudio(): void {
  // A recording already playing means the element is in use (and unlocked): swapping its src would break it.
  if (primed || cutOffCurrent) return;
  primed = true;
  try {
    const el = sharedAudio();
    if (!el) return;
    el.src = SILENT_MP3;
    Promise.resolve(el.play()).catch((err: unknown) => {
      // Refused (called outside a gesture): let the next gesture try again.
      if ((err as { name?: string } | null)?.name === 'NotAllowedError') primed = false;
    });
  } catch {
    // Priming is best-effort: never let it break a click.
  }
}
