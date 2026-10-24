// Recorded-voice playback (recorded-voices plan §6.1, §6.5), against a fake Audio element.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { voiceObjectPath, recordedVoiceUrl } from '../voiceKey';
import { GREETING_TEXT } from '../../../screens/exam/examAnnouncements';
import { FakeAudio, settle, until } from './fakeAudio';

const SUPABASE = 'https://mlukwnhpazxbgaqyskjl.supabase.co';

type Module = typeof import('../recordedVoice');
let rv: Module;

async function urlOf(text: string): Promise<string> {
  return recordedVoiceUrl(SUPABASE, await voiceObjectPath(text, 'henri'));
}

/** Starts a play and waits until it has reached the audio element. */
async function start(text: string, opts?: Parameters<Module['playRecorded']>[1]) {
  const before = FakeAudio.shared?.plays.length ?? 0;
  const result = rv.playRecorded(text, opts);
  await until(() => (FakeAudio.shared?.plays.length ?? 0) > before, 'play()');
  return { result, audio: FakeAudio.shared! };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubEnv('VITE_RECORDED_VOICES', '1');
  vi.stubEnv('VITE_SUPABASE_URL', SUPABASE);
  FakeAudio.reset();
  vi.stubGlobal('Audio', FakeAudio);
  vi.resetModules();
  rv = await import('../recordedVoice');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('recordedVoicesEnabled', () => {
  it('needs both the flag and a Supabase URL', () => {
    expect(rv.recordedVoicesEnabled()).toBe(true);
    vi.stubEnv('VITE_RECORDED_VOICES', '0');
    expect(rv.recordedVoicesEnabled()).toBe(false);
    vi.stubEnv('VITE_RECORDED_VOICES', '1');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(rv.recordedVoicesEnabled()).toBe(false);
  });
});

describe('playRecorded', () => {
  it('plays the file at the voiceKey URL and resolves "played" when it ends', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result, audio } = await start('Bonjour.', { onStart, onEnd });
    expect(audio.src).toBe(await urlOf('Bonjour.'));
    expect(audio.preservesPitch).toBe(true);
    expect(audio.playbackRate).toBe(1);
    audio.emit('playing');
    expect(onStart).toHaveBeenCalledTimes(1);
    audio.emit('ended');
    await expect(result).resolves.toBe('played');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(audio.listenerCount()).toBe(0);
  });

  it('a 404 (error event) resolves "missing", and the next call skips the network', async () => {
    const { result, audio } = await start('Ligne absente.');
    audio.emit('error');
    await expect(result).resolves.toBe('missing');
    expect(audio.paused).toBe(true);

    await expect(rv.playRecorded('Ligne absente.')).resolves.toBe('missing');
    expect(audio.plays).toHaveLength(1);
  });

  it('no "playing" within 3 s resolves "missing" and is remembered', async () => {
    const { result, audio } = await start('Trop lent.');
    vi.advanceTimersByTime(2999);
    await settle();
    let settled = false;
    void result.then(() => (settled = true));
    await settle();
    expect(settled).toBe(false);
    vi.advanceTimersByTime(1);
    await expect(result).resolves.toBe('missing');
    expect(audio.paused).toBe(true);

    await expect(rv.playRecorded('Trop lent.')).resolves.toBe('missing');
    expect(audio.plays).toHaveLength(1);
  });

  it('an autoplay refusal resolves "missing" but is NOT remembered', async () => {
    FakeAudio.nextPlay = 'NotAllowedError';
    const first = await start('Bloqué.');
    await expect(first.result).resolves.toBe('missing');

    FakeAudio.nextPlay = 'ok';
    const second = await start('Bloqué.');
    expect(second.audio.plays).toHaveLength(2);
    second.audio.emit('playing');
    second.audio.emit('ended');
    await expect(second.result).resolves.toBe('played');
  });

  it('any other play() rejection is remembered as missing', async () => {
    FakeAudio.nextPlay = 'NotSupportedError';
    const { result, audio } = await start('Format inconnu.');
    await expect(result).resolves.toBe('missing');
    FakeAudio.nextPlay = 'ok';
    await expect(rv.playRecorded('Format inconnu.')).resolves.toBe('missing');
    expect(audio.plays).toHaveLength(1);
  });

  it('stopRecorded() mid-play resolves "stopped", pauses, and fires onEnd once', async () => {
    const onEnd = vi.fn();
    const { result, audio } = await start('Arrête.', { onEnd });
    audio.emit('playing');
    rv.stopRecorded();
    await expect(result).resolves.toBe('stopped');
    expect(audio.paused).toBe(true);
    expect(onEnd).toHaveBeenCalledTimes(1);
    // A stop is not a missing file.
    const again = await start('Arrête.');
    again.audio.emit('playing');
    again.audio.emit('ended');
    await expect(again.result).resolves.toBe('played');
  });

  it('stopRecorded() before the URL is built resolves "stopped" and never touches the element', async () => {
    const result = rv.playRecorded('Jamais joué.');
    rv.stopRecorded();
    await expect(result).resolves.toBe('stopped');
    expect(FakeAudio.shared).toBeNull();
  });

  it('a second call cuts off the first, which resolves "stopped"', async () => {
    const first = await start('Première ligne.');
    first.audio.emit('playing');
    const second = await start('Deuxième ligne.');
    await expect(first.result).resolves.toBe('stopped');
    expect(second.audio.src).toBe(await urlOf('Deuxième ligne.'));
    second.audio.emit('playing');
    second.audio.emit('ended');
    await expect(second.result).resolves.toBe('played');
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('a playback that stalls after starting still ends (file length + grace)', async () => {
    const { result, audio } = await start('Bloqué au milieu.');
    audio.duration = 2;
    audio.emit('playing');
    vi.advanceTimersByTime(2000 + 4000);
    await expect(result).resolves.toBe('played');
  });

  it('maps a browser-voice rate onto playbackRate (relative to 0.9, clamped to 0.5–1)', async () => {
    expect(rv.recordedPlaybackRate()).toBe(1);
    expect(rv.recordedPlaybackRate(0.9)).toBe(1);
    expect(rv.recordedPlaybackRate(0.6)).toBeCloseTo(0.6667, 3);
    expect(rv.recordedPlaybackRate(0.3)).toBe(0.5);
    expect(rv.recordedPlaybackRate(1.4)).toBe(1);
    const { audio } = await start('Lentement.', { rate: 0.6 });
    expect(audio.playbackRate).toBeCloseTo(0.6667, 3);
    expect(audio.preservesPitch).toBe(true);
  });
});

describe('primeRecordedAudio', () => {
  it('plays a silent clip on the shared element, once, and never throws', async () => {
    rv.primeRecordedAudio();
    rv.primeRecordedAudio();
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.shared!.plays).toHaveLength(1);
    expect(FakeAudio.shared!.plays[0]).toMatch(/^data:audio\/mpeg;base64,/);

    vi.resetModules();
    FakeAudio.reset();
    FakeAudio.nextPlay = 'NotAllowedError';
    const fresh = await import('../recordedVoice');
    expect(() => fresh.primeRecordedAudio()).not.toThrow();
    await settle();
  });
});

describe('key parity with the recording script', () => {
  it("the app's URL for the exam greeting is the file the workflow uploaded", async () => {
    expect(await rv.recordedLineUrl(GREETING_TEXT)).toBe(
      'https://mlukwnhpazxbgaqyskjl.supabase.co/storage/v1/object/public/tts-audio/v2/henri/2363d401f53d9816d3b069c74953fd5a.mp3',
    );
    expect(rv.DEFAULT_RECORDED_VOICE).toBe('henri');
  });
});
