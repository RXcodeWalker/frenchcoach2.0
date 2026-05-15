import { useMemo } from 'react';
import type { FeedbackV2, TranscriptSpan } from '../../../types';

export interface AnnotatedSegment {
  text: string;
  span?: TranscriptSpan;
}

export function useTranscriptIssues(feedback: FeedbackV2): AnnotatedSegment[] {
  return useMemo(() => {
    const transcript = feedback.grammar?.critical
      .map(e => e.diagnostic)
      .join(' ') ?? '';
    const annotations = feedback.transcriptAnnotations ?? [];

    if (!annotations.length) return [{ text: transcript }];

    // Sort spans by start offset
    const sorted = [...annotations].sort((a, b) => a.start - b.start);
    const segments: AnnotatedSegment[] = [];
    let cursor = 0;

    for (const span of sorted) {
      if (span.start > cursor) {
        segments.push({ text: transcript.slice(cursor, span.start) });
      }
      segments.push({ text: transcript.slice(span.start, span.end), span });
      cursor = span.end;
    }

    if (cursor < transcript.length) {
      segments.push({ text: transcript.slice(cursor) });
    }

    return segments;
  }, [feedback]);
}
