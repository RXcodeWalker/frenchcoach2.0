// @vitest-environment jsdom
// ttsService with recorded voices (recorded-voices plan §6.2, §6.5): the real service against a fake
// speechSynthesis and a fake Audio element.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAudio, settle, until } from './fakeAudio';

interface FakeVoice { name: string; lang: string; localService: boolean }
const EN: FakeVoice = { name: 'Alex', lang: 'en-US', localService: true };
const FR: FakeVoice = { name: 'Thomas', lang: 'fr-FR', localService: true };

const spoken: Array<{ text: string; voice: FakeVoice | null; rate: number }> = [];

function installSynthesis(voices: FakeVoice[]) {
  spoken.length = 0;
  class FakeUtterance {
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: FakeVoice | null = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(public text: string) {}
  }
  const synth = {
    speaking: false,
    pending: false,
    getVoices: () => voices,
    addEventListener: () => {},
    removeEventListener: () => {},
    cancel: vi.fn(),
    speak: vi.fn((u: FakeUtterance) => {
      spoken.push({ text: u.text, voice: u.voice, rate: u.rate });
      queueMicrotask(() => u.onend?.());
    }),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  return synth;
}

async function loadTts(voices: FakeVoice[], flag: '1' | '0') {
  vi.stubEnv('VITE_RECORDED_VOICES', flag);
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  const synth = installSynthesis(voices);
  vi.resetModules();
  const { TTS } = await import('../ttsService');
  return { synth, TTS };
}

/** Waits until the recording reached the shared element's play(). */
async function audioPlaying(count = 1): Promise<FakeAudio> {
  await until(() => (FakeAudio.shared?.plays.filter((s) => !s.startsWith('data:')).length ?? 0) >= count, 'recording');
  return FakeAudio.shared!;
}

beforeEach(() => {
  FakeAudio.reset();
  vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('flag off: recorded callers get exactly today\'s browser voice', () => {
  it('speak(…, { recorded: true }) goes straight to speechSynthesis and never creates an Audio element', async () => {
    const { synth, TTS } = await loadTts([EN, FR], '0');
    await TTS.speak('Bonjour.', { recorded: true });
    await TTS.speak('Lentement.', { recorded: true, rate: 0.6 });
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(spoken).toEqual([
      { text: 'Bonjour.', voice: FR, rate: 0.9 },
      { text: 'Lentement.', voice: FR, rate: 0.6 },
    ]);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(TTS.canSpeakFrench(true)).toBe(true);
  });

  it('with only an English voice it still behaves as before (canSpeakFrench stays false)', async () => {
    const { synth, TTS } = await loadTts([EN], '0');
    expect(TTS.canSpeakFrench(true)).toBe(false);
    await TTS.speak('Bonjour.', { recorded: true });
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(FakeAudio.instances).toHaveLength(0);
  });
});

describe('flag on', () => {
  it('a caller without `recorded` keeps the browser voice', async () => {
    const { synth, TTS } = await loadTts([FR], '1');
    await TTS.speak('Texte de l’IA.');
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it('a recording that plays is used instead of the browser voice, with isSpeaking and the state callbacks', async () => {
    const { synth, TTS } = await loadTts([FR], '1');
    const onStart = vi.fn();
    const onEnd = vi.fn();
    TTS.onStateChange({ onStart, onEnd });
    const done = TTS.speak('Bonjour.', { recorded: true });
    const audio = await audioPlaying();
    onEnd.mockClear(); // speak() stops what was playing first, which fires onEnd
    audio.emit('playing');
    expect(TTS.isSpeaking()).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    audio.emit('ended');
    await done;
    expect(TTS.isSpeaking()).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('recorded + missing + no French voice: silent — speechSynthesis.speak is never called', async () => {
    const { synth, TTS } = await loadTts([EN], '1');
    expect(TTS.canSpeakFrench()).toBe(false);
    expect(TTS.canSpeakFrench(true)).toBe(true);
    const done = TTS.speak('Ligne absente.', { recorded: true });
    (await audioPlaying()).emit('error');
    await done;
    // Cached as missing: the second call never reaches the network either.
    await TTS.speak('Ligne absente.', { recorded: true });
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('recorded + missing + French voice: the French browser voice reads it, at the caller\'s rate', async () => {
    const { synth, TTS } = await loadTts([EN, FR], '1');
    const done = TTS.speak('Ligne absente.', { recorded: true, rate: 0.6 });
    (await audioPlaying()).emit('error');
    await done;
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual([{ text: 'Ligne absente.', voice: FR, rate: 0.6 }]);
  });

  it('stop() stops the recording, resolves the speak, and nothing falls back', async () => {
    const { synth, TTS } = await loadTts([FR], '1');
    const done = TTS.speak('Bonjour.', { recorded: true });
    const audio = await audioPlaying();
    audio.emit('playing');
    TTS.stop();
    await done;
    expect(audio.paused).toBe(true);
    expect(TTS.isSpeaking()).toBe(false);
    await settle();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('a new recorded line cuts off the one playing', async () => {
    const { TTS } = await loadTts([FR], '1');
    const first = TTS.speak('Un.', { recorded: true });
    const audio = await audioPlaying(1);
    audio.emit('playing');
    const second = TTS.speak('Deux.', { recorded: true });
    await first;
    await audioPlaying(2);
    audio.emit('playing');
    audio.emit('ended');
    await second;
    expect(audio.plays.filter((s) => !s.startsWith('data:'))).toHaveLength(2);
  });
});
