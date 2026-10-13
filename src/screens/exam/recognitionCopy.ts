import type { RecognitionFallbackReason } from '../../domain/igcse/stt/types';
import type { RecognitionSummary } from '../../domain/igcse/stt/quality/summariseRecognition';

/** Plain-language reason, completing "…marked from live captions because …". */
export const FALLBACK_REASON_COPY: Record<RecognitionFallbackReason, string> = {
  'no-audio': 'no recording was kept for it',
  'asr-failed': 'the transcription service could not be reached',
  'asr-timeout': 'the transcription service took too long',
  'asr-rejected': 'the recording did not transcribe cleanly',
  consent: 'a parent or guardian has not confirmed speaking practice yet',
  quota: "today's transcription allowance was used up",
};

/** The one sentence both screens use; null when every recognised answer was read by the batch recogniser. */
export function liveCaptionsSentence(summary: RecognitionSummary, tense: 'was' | 'will be'): string | null {
  const n = summary.fromLiveCaptions;
  if (n === 0) return null;
  const subject = n === 1 ? '1 answer' : `${n} answers`;
  const verb = n === 1 ? tense : tense === 'was' ? 'were' : 'will be';
  return `${subject} ${verb} marked from live captions.`;
}

export function liveCaptionsReasons(summary: RecognitionSummary): string[] {
  return (Object.entries(summary.reasons) as [RecognitionFallbackReason, number][])
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${count}: ${FALLBACK_REASON_COPY[reason]}`);
}
