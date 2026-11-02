import { CUES, cueLength, type SfxName } from './cues';

/**
 * Sound effects (Web Audio synthesis; the cues are in `cues.ts`).
 *
 * This module is deliberately stateless with respect to the app: it does not
 * import `AppContext` or any store. One bridge component (`SfxBridge`) pushes the
 * learner's Sound-effects setting in through `setSfxEnabled`, so a feature that
 * must not touch app state (the games) can still play a cue.
 *
 * Three rules make a cue safe to fire from anywhere:
 *  1. **Never while a mic is open.** Every recorder holds `holdSfxSilence()` for as
 *     long as it is listening, so a cue can never end up in a transcript, a
 *     Whisper upload or a pronunciation take.
 *  2. **Never in an exam** (`ExamLayout` holds the silence for the whole route) —
 *     the examiner voice and the mic run continuously there, and a chime must not
 *     signal anything about a mark.
 *  3. **Never stale.** A cue that cannot start now (page hidden, audio still
 *     locked) is dropped, not queued, so nothing plays late.
 *
 * With no Web Audio (tests, old browsers) every call is a quiet no-op.
 */

/** Overall loudness. Individual notes are already quiet; with the gain budget in cues.ts a chord peaks around 0.5. */
const MASTER_GAIN = 0.7;
/** The same cue twice inside this window is one cue (double renders, StrictMode). */
const DUPLICATE_WINDOW_MS = 70;
/** How long a request waits for a locked AudioContext to resume before it is dropped as stale. */
const RESUME_GRACE_MS = 300;

interface Engine {
  ctx: AudioContext;
  out: AudioNode;
}

let enabled = true;
let silence = 0;
let engine: Engine | null | undefined; // undefined = not tried, null = unsupported
let last: { name: SfxName; priority: number; at: number; until: number } | null = null;

function contextCtor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getEngine(): Engine | null {
  if (engine !== undefined) return engine;
  const Ctor = contextCtor();
  if (!Ctor) {
    engine = null;
    return engine;
  }
  try {
    const ctx = new Ctor();
    // No compressor: its automatic make-up gain differs per browser, which makes loudness
    // unpredictable. Instead every cue's notes are budgeted so peak = note gain x MASTER_GAIN
    // stays well under full scale even for a chord (see cues.ts).
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    engine = { ctx, out: master };
  } catch {
    engine = null;
  }
  return engine;
}

/** The learner's Sound-effects setting (Profile). */
export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

export function isSfxEnabled(): boolean {
  return enabled;
}

/**
 * Hold sound off until the returned function is called (idempotent). Used for
 * every open microphone and for the exam routes.
 */
export function holdSfxSilence(): () => void {
  silence += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    silence = Math.max(0, silence - 1);
  };
}

export function isSfxSilenced(): boolean {
  return silence > 0;
}

/**
 * Create and resume the audio context. Browsers (iOS above all) only allow that
 * inside a user gesture, so `installSfxUnlock` calls this on the first tap or key.
 */
export function unlockSfx(): void {
  const e = getEngine();
  if (e && e.ctx.state === 'suspended') void e.ctx.resume().catch(() => undefined);
}

/** Unlock audio on the first user gesture. Returns the cleanup. */
export function installSfxUnlock(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const handler = () => {
    unlockSfx();
    off();
  };
  const off = () => events.forEach(ev => window.removeEventListener(ev, handler, true));
  events.forEach(ev => window.addEventListener(ev, handler, true));
  return off;
}

function schedule(e: Engine, name: SfxName): void {
  const cue = CUES[name];
  const { ctx, out } = e;
  const t0 = ctx.currentTime + 0.01;
  for (const note of cue.notes) {
    const start = t0 + note.at;
    const end = start + note.dur;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.setValueAtTime(note.f, start);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
    // 8 ms attack, then an exponential tail: no clicks at either end.
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(note.gain, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env);
    env.connect(out);
    osc.start(start);
    osc.stop(end + 0.02);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }
}

export interface PlayOptions {
  /** Wait this long, then decide: silence and the mic are checked when the cue is due, not when it was asked for. */
  delayMs?: number;
}

/** Play a cue, if sound is on, no mic is open and the page is showing. Never throws. */
export function playSfx(name: SfxName, options: PlayOptions = {}): void {
  try {
    if (options.delayMs && options.delayMs > 0) {
      setTimeout(() => playSfx(name), options.delayMs);
      return;
    }
    if (!enabled || silence > 0) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const e = getEngine();
    if (!e) return;

    const now = performance.now();
    const cue = CUES[name];
    if (last && last.name === name && now - last.at < DUPLICATE_WINDOW_MS) return;
    // A quieter cue yields to a louder one that is still sounding.
    if (last && last.priority > cue.priority && now < last.until) return;

    const start = () => {
      last = { name, priority: cue.priority, at: now, until: now + cueLength(cue) * 1000 };
      schedule(e, name);
    };

    if (e.ctx.state === 'running') {
      start();
    } else if (e.ctx.state === 'suspended') {
      // Not unlocked yet. Resume (this works inside a gesture) and play only if that is quick; never queue stale audio.
      void e.ctx.resume().then(() => {
        if (e.ctx.state === 'running' && performance.now() - now < RESUME_GRACE_MS && enabled && silence === 0) start();
      }).catch(() => undefined);
    }
  } catch {
    // Sound is decoration: it must never break the screen it decorates.
  }
}

/** Test seam: forget the context and every setting. */
export function resetSfxForTests(): void {
  enabled = true;
  silence = 0;
  engine = undefined;
  last = null;
}
