// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUES, cueLength, type SfxName } from '../cues';
import { holdSfxSilence, installSfxUnlock, isSfxSilenced, playSfx, resetSfxForTests, setSfxEnabled } from '../sfx';

/** The smallest Web Audio fake that records what was scheduled. */
class FakeContext {
  static instances: FakeContext[] = [];
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  oscillators: Array<{ frequency: { value?: number }; type: string }> = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  constructor() {
    FakeContext.instances.push(this);
  }
  private node() {
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    return { connect: vi.fn(), disconnect: vi.fn(), gain: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() };
  }
  createGain() {
    return this.node();
  }
  createDynamicsCompressor() {
    return this.node();
  }
  createOscillator() {
    const osc = { ...this.node(), type: 'sine', frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) };
    this.oscillators.push(osc);
    return osc;
  }
}

const ctx = () => FakeContext.instances[0];
const notesPlayed = () => FakeContext.instances.reduce((n, c) => n + c.oscillators.length, 0);

beforeEach(() => {
  FakeContext.instances = [];
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
  resetSfxForTests();
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  resetSfxForTests();
});

/** Advance past the duplicate window so the next cue is a fresh one. */
const tick = (ms = 500) => {
  vi.setSystemTime(Date.now() + ms);
  vi.advanceTimersByTime(ms);
};

describe('cue definitions', () => {
  const names = Object.keys(CUES) as SfxName[];

  it.each(names)('%s is short, soft and made of plain tones', name => {
    const cue = CUES[name];
    expect(cue.notes.length).toBeGreaterThan(0);
    expect(cueLength(cue)).toBeLessThanOrEqual(1);
    for (const n of cue.notes) {
      expect(n.gain).toBeGreaterThan(0);
      expect(n.gain).toBeLessThanOrEqual(0.6);
      // Phone and laptop speakers barely play below ~250 Hz.
      expect(Math.min(n.f, n.to ?? n.f)).toBeGreaterThanOrEqual(240);
      expect(n.f).toBeLessThan(4000);
      expect(['sine', 'triangle', undefined]).toContain(n.type);
    }
  });

  it('a miss is lower and quieter-sounding than a hit, never a high buzz', () => {
    const hit = Math.min(...CUES.correct.notes.map(n => n.f));
    const miss = Math.max(...CUES.wrong.notes.map(n => n.f));
    expect(miss).toBeLessThan(hit);
  });
});

describe('playSfx', () => {
  it('is a quiet no-op with no Web Audio', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    resetSfxForTests();
    expect(() => playSfx('correct')).not.toThrow();
    expect(FakeContext.instances).toHaveLength(0);
  });

  it('schedules one oscillator per note', () => {
    playSfx('correct');
    expect(notesPlayed()).toBe(CUES.correct.notes.length);
  });

  it('plays nothing when the learner turned sound off, and again when it is back on', () => {
    setSfxEnabled(false);
    playSfx('correct');
    expect(notesPlayed()).toBe(0);
    setSfxEnabled(true);
    playSfx('correct');
    expect(notesPlayed()).toBe(CUES.correct.notes.length);
  });

  it('plays nothing while silence is held (open mic, exam), and again once released', () => {
    const release = holdSfxSilence();
    expect(isSfxSilenced()).toBe(true);
    playSfx('correct');
    expect(notesPlayed()).toBe(0);
    release();
    release(); // idempotent: a double release never frees someone else's hold
    expect(isSfxSilenced()).toBe(false);
    playSfx('correct');
    expect(notesPlayed()).toBeGreaterThan(0);
  });

  it('two holders keep silence until both release', () => {
    const a = holdSfxSilence();
    const b = holdSfxSilence();
    a();
    expect(isSfxSilenced()).toBe(true);
    b();
    expect(isSfxSilenced()).toBe(false);
  });

  it('plays nothing while the page is hidden', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    playSfx('correct');
    expect(notesPlayed()).toBe(0);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('collapses the same cue fired twice at once (double render) into one', () => {
    playSfx('correct');
    playSfx('correct');
    expect(notesPlayed()).toBe(CUES.correct.notes.length);
    tick();
    playSfx('correct');
    expect(notesPlayed()).toBe(CUES.correct.notes.length * 2);
  });

  it('a quieter cue yields to a louder one that is still sounding, but not afterwards', () => {
    playSfx('achievement');
    const before = notesPlayed();
    playSfx('xp');
    expect(notesPlayed()).toBe(before);
    tick(1500);
    playSfx('xp');
    expect(notesPlayed()).toBe(before + CUES.xp.notes.length);
  });

  it('a louder cue is never held back by a quieter one', () => {
    playSfx('xp');
    playSfx('levelUp');
    expect(notesPlayed()).toBe(CUES.xp.notes.length + CUES.levelUp.notes.length);
  });

  it('checks silence when a delayed cue is due, not when it was asked for', () => {
    playSfx('stop', { delayMs: 260 });
    const release = holdSfxSilence(); // a mic opened in the meantime
    vi.advanceTimersByTime(300);
    expect(notesPlayed()).toBe(0);
    release();
    playSfx('stop', { delayMs: 100 });
    vi.advanceTimersByTime(150);
    expect(notesPlayed()).toBe(CUES.stop.notes.length);
  });

  it('never queues stale audio for a locked context: it resumes, and plays only if that is quick', async () => {
    playSfx('correct'); // creates the context
    tick();
    ctx().state = 'suspended';
    ctx().oscillators.length = 0;
    playSfx('correct');
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx().resume).toHaveBeenCalled();
    expect(ctx().oscillators.length).toBe(CUES.correct.notes.length);

    tick();
    ctx().state = 'suspended';
    ctx().oscillators.length = 0;
    ctx().resume.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(1000); // the browser took a second to unlock
      ctx().state = 'running';
    });
    playSfx('correct');
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx().oscillators.length).toBe(0);
  });

  it('survives a context that throws', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      constructor() {
        throw new Error('blocked');
      }
    };
    resetSfxForTests();
    expect(() => playSfx('correct')).not.toThrow();
  });
});

describe('installSfxUnlock', () => {
  it('creates and resumes the context on the first gesture, once', () => {
    const off = installSfxUnlock();
    expect(FakeContext.instances).toHaveLength(0);
    window.dispatchEvent(new Event('pointerdown'));
    expect(FakeContext.instances).toHaveLength(1);
    window.dispatchEvent(new Event('keydown'));
    expect(FakeContext.instances).toHaveLength(1);
    off();
  });
});
