import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Highlighter } from 'lucide-react';
import { correct } from '../../../components/motion/variants';
import { BreakdownCard } from './BreakdownCard';
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
  { severity: 'polish', label: 'Polish', swatch: 'bg-action' },
  { severity: 'strong', label: 'Strong', swatch: 'bg-progress' },
] as const;

/**
 * One marked stretch, played with the `correct` motion: the line strikes
 * through the learner's words, then the fix drops in beside them. Each mark
 * starts a little after the one before, so the answer is corrected in reading
 * order. Under reduced motion it is simply there.
 */
function Mark({ seg, order, reduced, onClick }: { seg: Segment; order: number; reduced: boolean; onClick: () => void }) {
  const color = SEVERITY_COLOR[seg.span!.severity];
  const correction = seg.issue?.correction;
  const d = 0.3 + order * 0.22;
  // A text-decoration (not an overlay) so a mark that wraps onto two lines is struck on both.
  const [struck, setStruck] = useState(reduced);
  useEffect(() => {
    if (reduced) return setStruck(true);
    const t = setTimeout(() => setStruck(true), (d + 0.1) * 1000);
    return () => clearTimeout(t);
  }, [reduced, d]);
  return (
    <button
      type="button"
      aria-label={`Issue: ${seg.issue?.diagnostic || seg.span!.category}`}
      className="rounded-sm text-left transition-colors duration-state hover:bg-surface-recessed"
      onClick={onClick}
    >
      <span
        className="text-ink-muted line-through decoration-2"
        style={{
          textDecorationColor: struck ? color : 'transparent',
          transition: reduced ? undefined : 'text-decoration-color 240ms var(--ease)',
        }}
      >
        {seg.text}
      </span>
      {correction && (
        <motion.span
          className="inline-block font-semibold"
          style={{ color }}
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : correct.fix(d)}
        >
          {'\u00a0'}{correction}
        </motion.span>
      )}
    </button>
  );
}

export function MarkedUpScript({ transcript, feedback, onIssueClick }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [activeIssue, setActiveIssue] = useState<CoachingIssue | null>(null);
  // The annotation offsets point into the transcript the backend graded.
  const text = feedback.gradedTranscript ?? transcript;
  const segments = buildSegments(text, feedback);

  const markers = segments.filter(s => s.span);
  if (!text && markers.length === 0) return null;
  const legend = LEGEND.filter(l => markers.some(m => m.span!.severity === l.severity));
  let order = 0;

  return (
    <BreakdownCard
      title="Your answer, marked up"
      icon={Highlighter}
      tone="correction"
      subtitle={markers.length > 0 ? 'Tap a correction to jump to why' : undefined}
    >
      <p lang="fr" className="text-body-base leading-loose text-ink">
        {segments.map((seg, i) => {
          if (!seg.span) return <span key={i}>{seg.text}</span>;
          return (
            <Mark
              key={i}
              seg={seg}
              order={order++}
              reduced={reduced}
              onClick={() => {
                if (!seg.issue) return;
                if (seg.span?.issueId) onIssueClick(seg.span.issueId);
                // The correction's own row (with its lesson) is the place to read it: jump there.
                // Only an issue with no row in the list opens the small popover instead.
                const id = seg.issue.id;
                const row = Array.from(document.querySelectorAll<HTMLElement>('[data-issue-id]')).find((el) => el.dataset.issueId === id);
                if (row) {
                  setActiveIssue(null);
                  row.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
                } else {
                  setActiveIssue(activeIssue?.id === seg.issue.id ? null : seg.issue);
                }
              }}
            />
          );
        })}
      </p>

      {activeIssue && (
        <div className="mt-3">
          <CoachingPopover issue={activeIssue} onClose={() => setActiveIssue(null)} />
        </div>
      )}

      {legend.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
          {legend.map(l => (
            <span key={l.severity} className="flex items-center gap-1.5 text-caption text-ink-muted">
              <span className={`inline-block h-0.5 w-3 rounded-pill ${l.swatch}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </BreakdownCard>
  );
}
