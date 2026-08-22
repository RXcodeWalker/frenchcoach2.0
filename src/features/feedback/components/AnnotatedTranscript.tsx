import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../../components/motion/variants';
import { SEVERITY_UNDERLINE } from '../theme/severity';
import { CoachingPopover } from './CoachingPopover';
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

export function buildSegments(transcript: string, feedback: FeedbackV2): Segment[] {
  const annotations = feedback.transcriptAnnotations ?? [];
  if (!annotations.length) return [{ text: transcript }];

  // The server guarantees non-overlapping, ordered spans (docs Stage 2), but
  // this defends against that guarantee anyway (finding E): a span that
  // starts before `cursor` would otherwise re-slice and re-emit text already
  // rendered by the previous span, duplicating it on screen.
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue; // fully/partially contained in a prior span — skip
    if (span.start > cursor) segments.push({ text: transcript.slice(cursor, span.start) });
    const issue = span.issueId ? feedback.issues?.find(i => i.id === span.issueId) : undefined;
    segments.push({ text: transcript.slice(span.start, span.end), span, issue });
    cursor = span.end;
  }
  if (cursor < transcript.length) segments.push({ text: transcript.slice(cursor) });
  return segments;
}

export function AnnotatedTranscript({ transcript, feedback, onIssueClick }: Props) {
  const [activeIssue, setActiveIssue] = useState<CoachingIssue | null>(null);
  const segments = buildSegments(transcript, feedback);

  const hasAnnotations = (feedback.transcriptAnnotations?.length ?? 0) > 0;
  if (!transcript && !hasAnnotations) return null;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-xl glass p-4">
      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Your Response</p>

      <p className="text-[12px] text-slate-300 leading-relaxed">
        {segments.map((seg, i) => {
          if (!seg.span) return <span key={i}>{seg.text}</span>;

          const underline = SEVERITY_UNDERLINE[seg.span.severity] ?? '';
          return (
            <button
              key={i}
              aria-label={`Issue: ${seg.issue?.diagnostic ?? seg.span.category}`}
              className={`cursor-pointer ${underline} hover:opacity-80 transition-opacity`}
              onClick={() => {
                if (seg.issue) {
                  setActiveIssue(activeIssue?.id === seg.issue.id ? null : seg.issue);
                  if (seg.span?.issueId) onIssueClick(seg.span.issueId);
                }
              }}
            >
              {seg.text}
            </button>
          );
        })}
      </p>

      {activeIssue && (
        <div className="mt-3">
          <CoachingPopover issue={activeIssue} onClose={() => setActiveIssue(null)} />
        </div>
      )}

      {hasAnnotations && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800">
          {(['major', 'minor', 'strong'] as const).map(s => (
            <span key={s} className="flex items-center gap-1 text-[9px] text-slate-600">
              <span className={`inline-block w-3 h-0.5 rounded ${
                s === 'major' ? 'bg-red-400' : s === 'minor' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              {s === 'major' ? 'Error' : s === 'minor' ? 'Minor' : 'Strong'}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
