/**
 * S3 transcript-quality summary → feeds ScoringEnvelope.transcriptConfidence (02 §3.8).
 * Mean is computed over words, not utterances — an utterance mean would let one
 * long confident sentence mask a garbled short one.
 */

import type { SessionTranscript, TranscriptQuality } from '../types';

const LOW_CONFIDENCE_THRESHOLD = 0.3;

export function summariseQuality(session: SessionTranscript): TranscriptQuality {
  const words = session.utterances.flatMap((u) => u.words);

  if (words.length === 0) {
    return { meanWordConfidence: 0, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 };
  }

  const meanWordConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
  const lowConfidenceWords = words.filter((w) => w.confidence < LOW_CONFIDENCE_THRESHOLD);
  const lowConfidenceSpanCount = lowConfidenceWords.length;
  const lowConfidenceSpanRatio = lowConfidenceSpanCount / words.length;

  return { meanWordConfidence, lowConfidenceSpanRatio, lowConfidenceSpanCount };
}

export { LOW_CONFIDENCE_THRESHOLD };
