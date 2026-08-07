import { describe, it, expect, afterEach } from 'vitest';
import {
  isTtsAvailable,
  isExaminerVoiceMuted,
  setExaminerVoiceMuted,
  speakExaminerText,
  stopExaminerVoice,
  primeExaminerVoice,
  getExaminerVoiceGeneration,
} from '../examinerVoice';

// C10: smoke import only — no `window`/`speechSynthesis` in the default node
// test environment, so this exercises the "unavailable" degrade path (the
// same path real headless/unsupported browsers hit) without needing a DOM.
describe('examinerVoice (smoke import, no DOM)', () => {
  it('reports TTS unavailable without a window', () => {
    expect(isTtsAvailable()).toBe(false);
  });

  it('mute state toggles without throwing when TTS is unavailable', () => {
    expect(isExaminerVoiceMuted()).toBe(false);
    setExaminerVoiceMuted(true);
    expect(isExaminerVoiceMuted()).toBe(true);
    setExaminerVoiceMuted(false);
    expect(isExaminerVoiceMuted()).toBe(false);
  });

  it('speakExaminerText resolves (never rejects) when TTS is unavailable', async () => {
    await expect(speakExaminerText('Bonjour')).resolves.toBeUndefined();
  });

  it('speakExaminerText resolves immediately for empty text', async () => {
    await expect(speakExaminerText('')).resolves.toBeUndefined();
  });

  it('stopExaminerVoice never throws when TTS is unavailable', () => {
    expect(() => stopExaminerVoice()).not.toThrow();
  });
});

/**
 * Cancellation semantics: the greeting is spoken behind a short lead delay, so
 * leaving the greeting screen has to drop speech that has not started yet — not
 * just cancel what is audible.
 */
describe('examinerVoice cancellation (fake speechSynthesis)', () => {
  interface SpokenUtterance { text: string; volume: number }

  function installFakeSynthesis() {
    const spoken: SpokenUtterance[] = [];
    class FakeUtterance {
      lang = '';
      rate = 1;
      volume = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const synthesis = {
      getVoices: () => [],
      speak: (u: FakeUtterance) => {
        spoken.push({ text: u.text, volume: u.volume });
        u.onend?.();
      },
      cancel: () => {},
      resume: () => {},
      onvoiceschanged: null,
    };
    (globalThis as Record<string, unknown>).window = { speechSynthesis: synthesis };
    (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = FakeUtterance;
    return spoken;
  }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
    setExaminerVoiceMuted(false);
  });

  it('drops speech issued under a superseded generation', async () => {
    const spoken = installFakeSynthesis();
    const gen = getExaminerVoiceGeneration();
    stopExaminerVoice();

    await speakExaminerText('Bonjour', gen);
    expect(spoken).toHaveLength(0);

    await speakExaminerText('Bonjour', getExaminerVoiceGeneration());
    expect(spoken.map((u) => u.text)).toEqual(['Bonjour']);
  });

  it('primes the engine with a silent utterance, once', () => {
    const spoken = installFakeSynthesis();
    primeExaminerVoice();
    primeExaminerVoice();
    expect(spoken.filter((u) => u.volume === 0)).toHaveLength(1);
  });
});
