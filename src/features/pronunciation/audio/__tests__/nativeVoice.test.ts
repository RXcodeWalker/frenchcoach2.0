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
const sentence = vi.hoisted(() => ({
  ready: false,
  pending: null as Promise<boolean> | null,
  request: vi.fn(),
  forget: vi.fn(),
}));

vi.mock('../../../../services/tts/recordedVoice', () => ({
  recordedVoicesEnabled: () => recorded.enabled,
  primeRecordedAudio: () => {},
  forgetMissingRecording: async (text: string) => {
    sentence.forget(text);
    if (sentence.ready) recorded.results.set(text, 'played');
  },
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
vi.mock('../../../../services/tts/sentenceVoice', () => ({
  requestSentenceRecording: (text: string) => {
    sentence.request(text);
    return sentence.pending ?? Promise.resolve(sentence.ready);
  },
}));

import { canPlayNative, playNative, stopNative } from '../nativeVoice';

beforeEach(() => {
  recorded.enabled = true;
  recorded.results.clear();
  recorded.play.mockClear();
  tts.french = true;
  tts.speak.mockClear();
  tts.speak.mockImplementation(async () => {});
  clip.stop.mockClear();
  sentence.ready = false;
  sentence.pending = null;
  sentence.request.mockClear();
  sentence.forget.mockClear();
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

describe('playNative — an AI-written sentence (Stage 4b)', () => {
  const S = 'Le week-end dernier, je suis allé au cinéma.';

  it('without synthesize, a missing recording never asks the backend', async () => {
    await expect(playNative(S)).resolves.toBe('browser');
    expect(sentence.request).not.toHaveBeenCalled();
  });

  it('asks the backend once, then plays the new recording', async () => {
    sentence.ready = true;
    const onPreparing = vi.fn();
    await expect(playNative(S, { synthesize: true, onPreparing })).resolves.toBe('recorded');
    expect(onPreparing).toHaveBeenCalledTimes(1);
    expect(sentence.request).toHaveBeenCalledWith(S);
    expect(sentence.forget).toHaveBeenCalledWith(S);
    expect(recorded.play.mock.calls.map((c) => c[0])).toEqual([S, S]);
    expect(tts.speak).not.toHaveBeenCalled();
  });

  it('a refused request falls back to the French browser voice', async () => {
    await expect(playNative(S, { synthesize: true })).resolves.toBe('browser');
    expect(sentence.request).toHaveBeenCalledTimes(1);
    expect(tts.speak).toHaveBeenCalledWith(S, { rate: 0.9 });
  });

  it('an existing recording never reaches the backend', async () => {
    recorded.results.set(S, 'played');
    await expect(playNative(S, { synthesize: true })).resolves.toBe('recorded');
    expect(sentence.request).not.toHaveBeenCalled();
  });

  it('with recorded voices off, nothing is asked for', async () => {
    recorded.enabled = false;
    await expect(playNative(S, { synthesize: true })).resolves.toBe('browser');
    expect(sentence.request).not.toHaveBeenCalled();
  });

  it('a stop while the backend records resolves "stopped" and plays nothing', async () => {
    let finish: (v: boolean) => void = () => {};
    sentence.pending = new Promise<boolean>((r) => { finish = r; });
    const playing = playNative(S, { synthesize: true });
    await new Promise((r) => setTimeout(r, 0));
    stopNative();
    finish(true);
    await expect(playing).resolves.toBe('stopped');
    expect(recorded.play).toHaveBeenCalledTimes(1);
    expect(tts.speak).not.toHaveBeenCalled();
  });
});
