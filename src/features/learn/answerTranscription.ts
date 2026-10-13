/**
 * "Did we hear you right?" for Learn (transcription-accuracy plan, Phase 3).
 * After the student stops, the recording goes to /api/transcribe (Whisper) with
 * the question as context. Whisper's text becomes the PRIMARY transcript;
 * Chrome's live captions are the second opinion the confirm screen compares it
 * with. If Whisper is unavailable or its result is suspect, the live captions
 * are used exactly as before — a transcription problem never blocks an answer.
 *
 * The prompt holds context only: the question text, then this session's
 * earlier confirmed answers. Never the model answer, a hint or a vocabulary list.
 */

import { ConsentRequiredError } from '../../lib/consentRequired';
import { suspectTranscription } from '../../domain/transcription/suspectTranscription';
import { ApiHttpError, transcribeAudio, type TranscribeAudioResult } from '../../services/api/apiClient';

/** Fallback reasons share the exam's vocabulary (plan Phase 4) so one set of labels serves both. */
export type TranscriptionFallbackReason =
  | 'no-audio'
  | 'asr-failed'
  | 'asr-timeout'
  | 'asr-rejected'
  | 'consent'
  | 'quota';

export interface AnswerTranscription {
  /** What the student sees; once confirmed, what the feedback is about. */
  primaryText: string;
  /** The other recogniser's text. Empty when the live captions are the only source. */
  secondaryText: string;
  source: 'whisper' | 'live-captions';
  /** Why the live captions were used instead of Whisper; null when Whisper is the source. */
  fallbackReason: TranscriptionFallbackReason | null;
}

/** Whisper must answer inside this window or the live captions are used (plan: inside the 8 s budget). */
export const LEARN_TRANSCRIBE_TIMEOUT_MS = 8000;

/** The backend rejects a prompt over 1200 characters (422); stay well under it. */
const MAX_PROMPT_CHARS = 1000;
const MAX_QUESTION_CHARS = 400;

/**
 * First line: the question. Following lines: earlier confirmed answers, oldest
 * first — the backend keeps the question and the most recent context when it
 * cuts the prompt to Whisper's 224-token limit.
 */
export function buildTranscriptionPrompt(questionText: string, earlierAnswers: readonly string[]): string {
  const question = questionText.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_CHARS);
  const kept: string[] = [];
  let used = question.length;
  for (let i = earlierAnswers.length - 1; i >= 0; i--) {
    const answer = earlierAnswers[i].replace(/\s+/g, ' ').trim();
    if (!answer) continue;
    if (used + 1 + answer.length > MAX_PROMPT_CHARS) break;
    kept.unshift(answer);
    used += 1 + answer.length;
  }
  return [question, ...kept].join('\n');
}

function liveCaptionsOnly(liveText: string, fallbackReason: TranscriptionFallbackReason): AnswerTranscription {
  return { primaryText: liveText, secondaryText: '', source: 'live-captions', fallbackReason };
}

function reasonFor(err: unknown): TranscriptionFallbackReason {
  if (err instanceof ConsentRequiredError) return 'consent';
  if (err instanceof ApiHttpError && err.status === 429) return 'quota';
  if (err instanceof Error && /timed out/i.test(err.message)) return 'asr-timeout';
  return 'asr-failed';
}

export interface TranscribeLearnAnswerInput {
  /** Chrome's live-caption text for this answer. */
  liveText: string;
  /** The recorded answer; null when no audio could be captured. */
  audio: Blob | null;
  questionText: string;
  earlierAnswers: readonly string[];
  /** Injectable for tests. */
  transcribe?: (audio: Blob, language: string, options: Parameters<typeof transcribeAudio>[2]) => Promise<TranscribeAudioResult>;
}

export async function transcribeLearnAnswer({
  liveText,
  audio,
  questionText,
  earlierAnswers,
  transcribe = transcribeAudio,
}: TranscribeLearnAnswerInput): Promise<AnswerTranscription> {
  if (!audio) return liveCaptionsOnly(liveText, 'no-audio');

  const prompt = buildTranscriptionPrompt(questionText, earlierAnswers);
  let result: TranscribeAudioResult;
  try {
    result = await transcribe(audio, 'fr', { prompt, purpose: 'learn', timeoutMs: LEARN_TRANSCRIBE_TIMEOUT_MS });
  } catch (err) {
    return liveCaptionsOnly(liveText, reasonFor(err));
  }

  if (result.source === 'transcription-unavailable') return liveCaptionsOnly(liveText, 'asr-failed');
  const text = result.text.trim();
  if (!text || suspectTranscription(text, result.segments, prompt)) return liveCaptionsOnly(liveText, 'asr-rejected');
  return { primaryText: text, secondaryText: liveText, source: 'whisper', fallbackReason: null };
}
