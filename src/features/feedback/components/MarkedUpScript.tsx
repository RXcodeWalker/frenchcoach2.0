import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../../components/motion/variants';
import { SEVERITY_COLOR } from '../theme/severity';
import { CoachingPopover } from './CoachingPopover';
import { canonicalizeForMatch } from '../../../domain/igcse/text/normalize';
import type { FeedbackV2, CoachingIssue, TranscriptSpan } from '../../../types';

interface Props {
  transcript: string;
  feedback: FeedbackV2;
  onIssueClick: (issueId: string) => void;
}

interface Segment {
  text: string;
  span?: TranscriptSpan;
  issue?: CoachingIssue;
}

// Shared with AnnotatedTranscript: the server guarantees non-overlapping,
// ordered spans (docs Stage 2), but this defends against that guarantee
// anyway (finding E) — a span starting before `cursor` would otherwise
// re-slice and re-emit text already rendered by a prior span.
//
// A span is dropped, never moved, when the text it covers is not its issue's
// quote: its offsets were computed against a different transcript (finding
// A0). Owner report 2026-10-31 — the strike-through landed a few letters late
// (« d|ans ton école », « des |autres choses fin|alement »).
export function buildSegments(transcript: string, feedback: FeedbackV2): Segment[] {
  const annotations = feedback.transcriptAnnotations ?? [];
  if (!annotations.length) return [{ text: transcript }];

  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue;
    const issue = span.issueId ? feedback.issues?.find(i => i.id === span.issueId) : undefined;
    if (issue?.quote && canonicalizeForMatch(transcript.slice(span.start, span.end)) !== canonicalizeForMatch(issue.quote)) continue;
    if (span.start > cursor) segments.push({ text: transcript.slice(cursor, span.start) });
    segments.push({ text: transcript.slice(span.start, span.end), span, issue });
    cursor = span.end;
  }
  if (cursor < transcript.length) segments.push({ text: transcript.slice(cursor) });
  return segments;
}

const LEGEND = [
  { severity: 'major', label: 'Error', swatch: 'bg-correction' },
  { severity: 'minor', label: 'Minor', swatch: 'bg-reward' },
  { severity: 'strong', label: 'Strong', swatch: 'bg-progress' },
] as const;

export function MarkedUpScript({ transcript, feedback, onIssueClick }: Props) {
  const [activeIssue, setActiveIssue] = useState<CoachingIssue | null>(null);
  // The annotation offsets point into the transcript the backend graded.
  const text = feedback.gradedTranscript ?? transcript;
  const segments = buildSegments(text, feedback);

  const markers = segments.filter(s => s.span);
  if (!text && markers.length === 0) return null;
  const legend = LEGEND.filter(l => markers.some(m => m.span!.severity === l.severity));

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-xl surface p-4">
      <p className="text-eyebrow text-ink-subtle uppercase mb-2.5">Your Response — Marked Up</p>

      <div>
        <p className="text-[12px] text-ink-muted leading-relaxed">
          {segments.map((seg, i) => {
            if (!seg.span) return <span key={i}>{seg.text}</span>;

            const color = SEVERITY_COLOR[seg.span.severity];
            const correction = seg.issue?.correction;
            return (
              <button
                key={i}
                aria-label={`Issue: ${seg.issue?.diagnostic ?? seg.span.category}`}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (seg.issue) {
                    setActiveIssue(activeIssue?.id === seg.issue.id ? null : seg.issue);
                    if (seg.span?.issueId) onIssueClick(seg.span.issueId);
                  }
                }}
              >
                <span
                  style={{ textDecorationColor: color }}
                  className="line-through decoration-2"
                >
                  {seg.text}
                </span>
                {correction && (
                  <span style={{ color }} className="font-medium">
                    {' '}{correction}
                  </span>
                )}
              </button>
            );
          })}
        </p>
      </div>

      {activeIssue && (
        <div className="mt-3">
          <CoachingPopover issue={activeIssue} onClose={() => setActiveIssue(null)} />
        </div>
      )}

      {legend.length > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-hairline">
          {legend.map(l => (
            <span key={l.severity} className="flex items-center gap-1 text-[12px] text-ink-subtle">
              <span className={`inline-block w-3 h-0.5 rounded ${l.swatch}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
