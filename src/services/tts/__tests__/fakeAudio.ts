/** A stand-in for `HTMLAudioElement` driven by the recorded-voice tests: they fire its events by hand. */
export class FakeAudio {
  static instances: FakeAudio[] = [];
  /** What the next `play()` does: resolve, or reject with this error name. */
  static nextPlay: 'ok' | 'NotAllowedError' | 'NotSupportedError' = 'ok';

  src = '';
  preload = '';
  playbackRate = 1;
  preservesPitch = false;
  duration = Number.NaN;
  ended = false;
  paused = true;
  /** Every `src` that `play()` was called with, in order. */
  plays: string[] = [];
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.instances.push(this);
  }

  static reset(): void {
    FakeAudio.instances = [];
    FakeAudio.nextPlay = 'ok';
  }

  /** The app's one shared element (null until something played). */
  static get shared(): FakeAudio | null {
    return FakeAudio.instances[0] ?? null;
  }

  addEventListener(type: string, cb: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: () => void): void {
    this.listeners.get(type)?.delete(cb);
  }

  emit(type: 'playing' | 'ended' | 'error'): void {
    if (type === 'ended') this.ended = true;
    for (const cb of [...(this.listeners.get(type) ?? [])]) cb();
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }

  play(): Promise<void> {
    this.plays.push(this.src);
    this.paused = false;
    this.ended = false;
    const outcome = FakeAudio.nextPlay;
    if (outcome === 'ok') return Promise.resolve();
    return Promise.reject(Object.assign(new Error(outcome), { name: outcome }));
  }

  pause(): void {
    this.paused = true;
  }
}

/** Waits (on real macrotasks) until `cond` holds: the key is hashed asynchronously before the element is touched. */
export async function until(cond: () => boolean, what = 'condition'): Promise<void> {
  for (let i = 0; i < 2000 && !cond(); i++) await new Promise((r) => setImmediate(r));
  if (!cond()) throw new Error(`timed out waiting for ${what}`);
}

/** Lets pending promise callbacks run (a few real macrotasks). */
export async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
}
