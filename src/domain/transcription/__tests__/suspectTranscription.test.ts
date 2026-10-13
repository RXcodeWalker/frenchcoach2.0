import { describe, expect, it } from 'vitest';
import { suspectTranscription } from '../suspectTranscription';

const seg = (noSpeechProb: number | null, compressionRatio: number | null = 1.2) => ({ noSpeechProb, compressionRatio });

describe('suspectTranscription', () => {
  it('trusts an ordinary result', () => {
    expect(suspectTranscription('Ils ont un chien.', [seg(0.02)], 'Parle-moi de ta famille.')).toBeNull();
  });

  it('trusts a result with no confidence data (the local fallback reports none)', () => {
    expect(suspectTranscription('Ils ont un chien.', [seg(null, null)])).toBeNull();
    expect(suspectTranscription('Ils ont un chien.', [])).toBeNull();
  });

  it('rejects text Whisper itself thinks is not speech', () => {
    expect(suspectTranscription('Sous-titres réalisés par la communauté', [seg(0.93)])).toBe('no-speech');
  });

  it('keeps a result where only some segments look like silence', () => {
    expect(suspectTranscription('Bonjour. Je suis Anna.', [seg(0.9), seg(0.05)])).toBeNull();
  });

  it('rejects a looping result', () => {
    expect(suspectTranscription('oui oui oui oui oui oui oui oui', [seg(0.01, 3.5)])).toBe('repetition');
  });

  it('rejects the context prompt echoed back', () => {
    const prompt = 'Parle-moi de ta famille.\nJ’ai un frère.';
    expect(suspectTranscription('Parle-moi de ta famille', [seg(0.1)], prompt)).toBe('prompt-echo');
  });

  it('does not call a short answer an echo even when its words are in the context', () => {
    expect(suspectTranscription('Oui, ma famille', [seg(0.1)], 'Parle-moi de ta famille.')).toBeNull();
  });

  it('does not call an answer an echo just because it shares some words with the question', () => {
    expect(suspectTranscription('Ma famille est petite et sympa', [seg(0.1)], 'Parle-moi de ta famille.')).toBeNull();
  });
});
