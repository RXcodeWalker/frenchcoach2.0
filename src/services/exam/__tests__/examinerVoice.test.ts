import { describe, it, expect } from 'vitest';
import {
  isTtsAvailable,
  isExaminerVoiceMuted,
  setExaminerVoiceMuted,
  speakExaminerText,
  stopExaminerVoice,
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
