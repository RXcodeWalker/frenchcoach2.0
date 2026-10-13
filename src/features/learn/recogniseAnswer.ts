/**
 * Learn's second opinion step: sends the answer's audio to Whisper (with the
 * question and this session's earlier confirmed answers as context only) and
 * pairs the result with Chrome's live text. Any failure — no audio, a
 * signed-out or consent-blocked account, a timeout, an unavailable backend, an
 * empty result, or Whisper echoing its prompt — falls back to Chrome's text and
 * says why. It never throws: the learner can always still confirm Chrome's text.
 */

import { transcribeAudio, type TranscribeAudioOptions, type TranscribeAudioResult } from '../../services/api/apiClient';
import { buildLearnPrompt, isPromptEcho, type Recognition } from '../../domain/transcription/confirmView';

/** Learn's budget for the Whisper round trip; the confirm screen waits at most this long. */
export const LEARN_TRANSCRIBE_TIMEOUT_MS = 8000;

type Transcribe = (blob: Blob, language: string, options: TranscribeAudioOptions) => Promise<TranscribeAudioResult>;

export interface RecogniseAnswerInput {
  audioBlob: Blob | null;
  chromeText: string;
  questionText: string;
  /** This session's earlier confirmed answers, oldest first. */
  earlierAnswers: readonly string[];
  transcribe?: Transcribe;
}

export async function recogniseAnswer(input: RecogniseAnswerInput): Promise<Recognition> {
  const { audioBlob, chromeText, questionText, earlierAnswers, transcribe = transcribeAudio } = input;
  if (!audioBlob || audioBlob.size === 0) return { whisperText: null, chromeText, fallbackReason: 'no-audio' };
  try {
    const result = await transcribe(audioBlob, 'fr', {
      prompt: buildLearnPrompt(questionText, earlierAnswers),
      purpose: 'learn',
      timeoutMs: LEARN_TRANSCRIBE_TIMEOUT_MS,
    });
    if (result.source === 'transcription-unavailable') return { whisperText: null, chromeText, fallbackReason: 'asr-failed' };
    const text = result.text.trim();
    if (!text) return { whisperText: null, chromeText, fallbackReason: 'asr-empty' };
    if (isPromptEcho(text, questionText)) return { whisperText: null, chromeText, fallbackReason: 'prompt-echo' };
    return { whisperText: text, chromeText };
  } catch (err) {
    const timedOut = err instanceof Error && /timed out/i.test(err.message);
    return { whisperText: null, chromeText, fallbackReason: timedOut ? 'asr-timeout' : 'asr-failed' };
  }
}
