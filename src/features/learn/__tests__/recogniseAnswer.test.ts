import { describe, it, expect, vi } from 'vitest';
import { recogniseAnswer, LEARN_TRANSCRIBE_TIMEOUT_MS } from '../recogniseAnswer';
import type { TranscribeAudioResult } from '../../../services/api/apiClient';

const BLOB = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
const base = { audioBlob: BLOB, chromeText: 'ils ont un chien', questionText: 'Avez-vous des animaux ?', earlierAnswers: ["J'aime les chats."] };
const ok = (text: string, source = 'groq-whisper'): TranscribeAudioResult => ({ text, source, segments: [] });

describe('recogniseAnswer', () => {
  it('asks Whisper with the question and earlier answers as context, purpose learn, inside the 8 s budget', async () => {
    const transcribe = vi.fn().mockResolvedValue(ok('Ils ont un chien.'));
    const out = await recogniseAnswer({ ...base, transcribe });
    expect(transcribe).toHaveBeenCalledWith(BLOB, 'fr', {
      prompt: "Avez-vous des animaux ?\nJ'aime les chats.",
      purpose: 'learn',
      timeoutMs: LEARN_TRANSCRIBE_TIMEOUT_MS,
    });
    expect(LEARN_TRANSCRIBE_TIMEOUT_MS).toBeLessThanOrEqual(8000);
    expect(out).toEqual({ whisperText: 'Ils ont un chien.', chromeText: 'ils ont un chien' });
  });

  it.each([
    ['a failed request', () => Promise.reject(new Error('API /api/transcribe → 503')), 'asr-failed'],
    ['a timeout', () => Promise.reject(new Error('Transcription request timed out')), 'asr-timeout'],
    ['a signed-out / consent-blocked refusal', () => Promise.reject(new Error('Sign in to use speech transcription.')), 'asr-failed'],
    ['the backend reporting transcription-unavailable', () => Promise.resolve(ok('', 'transcription-unavailable')), 'asr-failed'],
    ['an empty result', () => Promise.resolve(ok('  ')), 'asr-empty'],
    ['Whisper echoing the question', () => Promise.resolve(ok('Avez-vous des animaux ?')), 'prompt-echo'],
  ])('falls back to Chrome text on %s', async (_label, impl, reason) => {
    const out = await recogniseAnswer({ ...base, transcribe: vi.fn(impl) });
    expect(out).toEqual({ whisperText: null, chromeText: 'ils ont un chien', fallbackReason: reason });
  });

  it('falls back without calling the network when there is no audio', async () => {
    const transcribe = vi.fn();
    const out = await recogniseAnswer({ ...base, audioBlob: null, transcribe });
    expect(transcribe).not.toHaveBeenCalled();
    expect(out.fallbackReason).toBe('no-audio');
  });
});
