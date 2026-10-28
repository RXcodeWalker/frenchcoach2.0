// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSource {
  buffer: { duration: number } | null;
  playbackRate: { value: number };
  onended: (() => void) | null;
  started: [number, number, number] | null;
  stopped: boolean;
  connect: () => void;
  start: (when: number, offset: number, duration: number) => void;
  stop: () => void;
}

const sources: FakeSource[] = [];
let decodes = 0;

class FakeAudioContext {
  state = 'running';
  destination = {};
  resume = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => {
    decodes += 1;
    return { duration: 4 };
  });
  createBufferSource(): FakeSource {
    const source: FakeSource = {
      buffer: null,
      playbackRate: { value: 1 },
      onended: null,
      started: null,
      stopped: false,
      connect: () => {},
      start(when, offset, duration) {
        this.started = [when, offset, duration];
      },
      stop() {
        this.stopped = true;
      },
    };
    sources.push(source);
    return source;
  }
}

const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  sources.length = 0;
  decodes = 0;
  vi.resetModules();
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clipPlayer', () => {
  it('plays a window of the recording and resolves when it ends', async () => {
    const { playClip } = await import('../clipPlayer');
    const done = playClip(blob(), { startS: 1, endS: 1.5 });
    await flush();
    expect(sources[0].started).toEqual([0, 1, 0.5]);
    sources[0].onended?.();
    await expect(done).resolves.toBe(true);
  });

  it('plays the whole recording when there is no window, at the asked speed (clamped)', async () => {
    const { playClip } = await import('../clipPlayer');
    const done = playClip(blob(), null, { rate: 0.75 });
    await flush();
    expect(sources[0].started).toEqual([0, 0, 4]);
    expect(sources[0].playbackRate.value).toBe(0.75);
    sources[0].onended?.();
    await done;
    const fast = playClip(blob(), null, { rate: 9 });
    await flush();
    expect(sources[1].playbackRate.value).toBe(1.5);
    sources[1].onended?.();
    await fast;
  });

  it('a new clip cuts off the current one, which resolves instead of hanging', async () => {
    const { playClip, stopClip } = await import('../clipPlayer');
    const recording = blob();
    const first = playClip(recording, { startS: 0, endS: 1 });
    await flush();
    const second = playClip(recording, { startS: 2, endS: 3 });
    await expect(first).resolves.toBe(true);
    expect(sources[0].stopped).toBe(true);
    expect(decodes).toBe(1); // decoded once per blob
    stopClip();
    await expect(second).resolves.toBe(true);
  });

  it('returns false where Web Audio is missing', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { canPlayClips, playClip } = await import('../clipPlayer');
    expect(canPlayClips()).toBe(false);
    await expect(playClip(blob(), null)).resolves.toBe(false);
  });
});
