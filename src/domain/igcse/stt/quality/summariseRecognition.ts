/**
 * How the candidate's spoken answers were read (session-transcript-v2): by the
 * batch recogniser, or by the live captions with a recorded reason. Counts only;
 * it never feeds a mark. The results page uses it for "N answers were marked
 * from live captions"; the envelope's transcription block will be built from the
 * same numbers.
 */

import type { RecognitionFallbackReason, SessionTranscript } from '../types';

export interface RecognitionSummary {
  /** Candidate answers carrying a recognition record (typed, blanked and edited answers carry none). */
  recognisedAnswers: number;
  /** Answers whose marked text is the batch recogniser's reading. */
  fromBatch: number;
  /** Answers whose marked text is the live captions. */
  fromLiveCaptions: number;
  reasons: Partial<Record<RecognitionFallbackReason, number>>;
  /** The batch model that read the answers, when any did. */
  model: string | null;
}

export function summariseRecognition(session: Pick<SessionTranscript, 'utterances'>): RecognitionSummary {
  const summary: RecognitionSummary = { recognisedAnswers: 0, fromBatch: 0, fromLiveCaptions: 0, reasons: {}, model: null };
  for (const u of session.utterances) {
    if (u.role !== 'candidate' || !u.recognition) continue;
    summary.recognisedAnswers += 1;
    if (u.recognition.selected === 'primary') {
      summary.fromBatch += 1;
      summary.model ??= u.recognition.primary?.model ?? null;
    } else {
      summary.fromLiveCaptions += 1;
      const reason = u.recognition.fallbackReason;
      if (reason) summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
    }
  }
  return summary;
}
