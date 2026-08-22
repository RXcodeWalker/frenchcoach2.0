// Finding E (docs Stage 2): buildSegments couldn't handle overlapping
// annotations — when a span.start < cursor it re-emitted already-emitted
// text, duplicating it on screen. The server now guarantees non-overlapping,
// ordered spans, but this is a defensive guard on the client's own
// rendering regardless (never trust a wire contract alone for a rendering
// correctness property).

import { describe, it, expect } from 'vitest';
import { buildSegments } from '../AnnotatedTranscript';
import type { FeedbackV2, TranscriptSpan } from '../../../../types';

function feedbackWithAnnotations(annotations: TranscriptSpan[]): FeedbackV2 {
  return { transcriptAnnotations: annotations } as FeedbackV2;
}

describe('buildSegments', () => {
  it('returns the whole transcript as one segment when there are no annotations', () => {
    const segments = buildSegments('Bonjour le monde', feedbackWithAnnotations([]));
    expect(segments).toEqual([{ text: 'Bonjour le monde' }]);
  });

  it('splits the transcript around a single span', () => {
    const transcript = 'Je suis allé à Paris.';
    const span: TranscriptSpan = { start: 8, end: 12, severity: 'major', category: 'grammar' };
    const segments = buildSegments(transcript, feedbackWithAnnotations([span]));

    expect(segments.map(s => s.text)).toEqual(['Je suis ', 'allé', ' à Paris.']);
    expect(segments[1].span).toBe(span);
  });

  it('renders non-overlapping spans out of order without duplicating text', () => {
    const transcript = 'Un deux trois quatre';
    const first: TranscriptSpan = { start: 9, end: 13, severity: 'minor', category: 'grammar' }; // "trois"
    const second: TranscriptSpan = { start: 0, end: 2, severity: 'major', category: 'grammar' }; // "Un"
    const segments = buildSegments(transcript, feedbackWithAnnotations([first, second]));

    const rendered = segments.map(s => s.text).join('');
    expect(rendered).toBe(transcript);
  });

  it('skips a span that starts before the cursor instead of re-emitting overlapping text', () => {
    const transcript = 'abcdefghij';
    // "abcdef" (0-6) and an overlapping "cdefgh" (2-8) — the second must be
    // dropped, not rendered, since "cdef" would otherwise appear twice.
    const wide: TranscriptSpan = { start: 0, end: 6, severity: 'major', category: 'grammar' };
    const overlapping: TranscriptSpan = { start: 2, end: 8, severity: 'minor', category: 'grammar' };
    const segments = buildSegments(transcript, feedbackWithAnnotations([wide, overlapping]));

    const rendered = segments.map(s => s.text).join('');
    // The dropped span costs its own annotation, never text: "gh" still
    // renders as plain (unannotated) text via the cursor-to-end fallback.
    expect(rendered).toBe(transcript);
    // No segment's text should ever repeat a substring already covered by an earlier segment.
    expect(segments.filter(s => s.span).map(s => s.text)).toEqual(['abcdef']);
  });

  it('skips a span fully contained inside a prior span', () => {
    const transcript = 'abcdefghij';
    const outer: TranscriptSpan = { start: 0, end: 8, severity: 'major', category: 'grammar' };
    const inner: TranscriptSpan = { start: 2, end: 4, severity: 'minor', category: 'grammar' };
    const segments = buildSegments(transcript, feedbackWithAnnotations([outer, inner]));

    expect(segments.filter(s => s.span)).toHaveLength(1);
    expect(segments.map(s => s.text).join('')).toBe(transcript);
  });

  it('attaches the matching issue by issueId when present', () => {
    const transcript = 'Je suis allé à Paris.';
    const span: TranscriptSpan = { start: 8, end: 12, severity: 'major', category: 'grammar', issueId: 'c1' };
    const feedback: FeedbackV2 = {
      transcriptAnnotations: [span],
      issues: [{
        id: 'c1', category: 'grammar', severity: 'major', quote: 'allé',
        diagnostic: 'wrong auxiliary', correction: 'suis allé', marksImpact: 2,
      }],
    } as FeedbackV2;

    const segments = buildSegments(transcript, feedback);
    const annotated = segments.find(s => s.span);
    expect(annotated?.issue?.id).toBe('c1');
  });
});
