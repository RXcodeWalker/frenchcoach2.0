import { beforeEach, describe, expect, it, vi } from 'vitest';

const recorded = vi.hoisted(() => ({
  enabled: true,
  results: new Map<string, 'played' | 'missing' | 'stopped'>(),
  play: vi.fn(),
}));
const tts = vi.hoisted(() => ({
  french: true,
  speak: vi.fn(async () => {}),
  stop: vi.fn(),
}));
const clip = vi.hoisted(() => ({ stop: vi.fn() }));

vi.mock('../../../../services/tts/recordedVoice', () => ({
  recordedVoicesEnabled: () => recorded.enabled,
  primeRecordedAudio: () => {},
  playRecorded: (text: string, options: unknown) => {
    recorded.play(text, options);
    return Promise.resolve(recorded.results.get(text) ?? 'missing');
  },
}));
vi.mock('../../../../services/tts/ttsService', () => ({
  TTS: {
    speak: tts.speak,
    stop: tts.stop,
    ensureVoiceReady: async () => {},
    isSupported: () => true,
    hasFrenchVoice: () => tts.french,
    canSpeakFrench: (rec: boolean) => tts.french || (rec && recorded.enabled),
  },
}));
vi.mock('../clipPlayer', () => ({ stopClip: clip.stop }));

import { canPlayNative, playNative, stopNative } from '../nativeVoice';

beforeEach(() => {
  recorded.enabled = true;
  recorded.results.clear();
  recorded.play.mockClear();
  tts.french = true;
  tts.speak.mockClear();
  tts.speak.mockImplementation(async () => {});
  clip.stop.mockClear();
});

describe('playNative', () => {
  it('plays the recording when there is one, after stopping "▶ You"', async () => {
    recorded.results.set('rouge', 'played');
    await expect(playNative('rouge')).resolves.toBe('recorded');
    expect(clip.stop).toHaveBeenCalled();
    expect(tts.speak).not.toHaveBeenCalled();
  });

  it('tries each candidate for a recording, then reads the first with a French voice', async () => {
    recorded.results.set('enfants', 'played');
    await expect(playNative(['les enfants', 'enfants'])).resolves.toBe('recorded');
    expect(recorded.play.mock.calls.map((c) => c[0])).toEqual(['les enfants', 'enfants']);

    recorded.results.clear();
    await expect(playNative(['les enfants', 'enfants'])).resolves.toBe('browser');
    expect(tts.speak).toHaveBeenCalledWith('les enfants', { rate: 0.9 });
  });

  it('slow is 0.75 of the normal rate', async () => {
    await playNative('rouge', { speed: 0.75 });
    expect(recorded.play).toHaveBeenCalledWith('rouge', { rate: expect.closeTo(0.675) });
    expect(tts.speak).toHaveBeenCalledWith('rouge', { rate: expect.closeTo(0.675) });
  });

  it('never lets a non-French voice read French: no recording and no French voice is "unavailable"', async () => {
    tts.french = false;
    await expect(playNative('rouge')).resolves.toBe('unavailable');
    expect(tts.speak).not.toHaveBeenCalled();
  });

  it('skips recordings when recorded voices are off', async () => {
    recorded.enabled = false;
    await expect(playNative('rouge')).resolves.toBe('browser');
    expect(recorded.play).not.toHaveBeenCalled();
  });

  it('a stopped play resolves "stopped"', async () => {
    let finish: () => void = () => {};
    tts.speak.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    recorded.enabled = false;
    const playing = playNative('rouge');
    await new Promise((r) => setTimeout(r, 0));
    stopNative();
    finish();
    await expect(playing).resolves.toBe('stopped');
  });

  it('a speech error is "unavailable", and empty text plays nothing', async () => {
    recorded.enabled = false;
    tts.speak.mockImplementation(async () => { throw new Error('TTS error'); });
    await expect(playNative('rouge')).resolves.toBe('unavailable');
    await expect(playNative('  ')).resolves.toBe('unavailable');
  });

  it('canPlayNative: a French voice or the recordings', () => {
    tts.french = false;
    expect(canPlayNative()).toBe(true);
    recorded.enabled = false;
    expect(canPlayNative()).toBe(false);
  });
});
