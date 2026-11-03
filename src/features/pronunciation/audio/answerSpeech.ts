/**
 * Decodes a Learn answer once and runs the silence gate on it, for the speaking
 * log. Best effort like `answerPauses.ts`: anything that can't be decoded is null.
 */

import { normalizeToWav16kMono, readWavPcm16Mono } from '../../../domain/pronunciation/audioNormalizer';
import { trimSilence, type TrimResult } from '../../../domain/examPronunciation/trim';
import { ANSWER_MAX_SECONDS } from './answerPauses';

export type AnswerSpeech = Pick<TrimResult, 'hasSpeech' | 'rawS' | 'internalPausesS' | 'leadingSilenceS' | 'speechSpanS' | 'pauses'>;

export async function measureAnswerSpeech(blob: Blob): Promise<AnswerSpeech | null> {
  try {
    const normalized = await normalizeToWav16kMono(blob, { maxSeconds: ANSWER_MAX_SECONDS });
    const { samples, sampleRate } = await readWavPcm16Mono(normalized.blob);
    const { hasSpeech, rawS, internalPausesS, leadingSilenceS, speechSpanS, pauses } = trimSilence(samples, sampleRate);
    return { hasSpeech, rawS, internalPausesS, leadingSilenceS, speechSpanS, pauses };
  } catch {
    return null;
  }
}
