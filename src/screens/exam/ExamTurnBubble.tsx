import { Repeat } from 'lucide-react';
import { speakExaminerText, getExaminerVoiceGeneration, hasFrenchVoice } from '../../services/exam/examinerVoice';
import type { ConductLogEntry } from '../../domain/igcse/session/types';
import type { ExaminerFeedback } from '../../services/coaching/examinerFeedback';

const ACTION_LABEL: Record<string, string> = {
  READ_MAIN: 'Examiner',
  REPEAT: 'Examiner (repeating)',
  READ_ALTERNATIVE: 'Examiner (alternative question)',
  EXTENSION_PROMPT: 'Examiner',
  FURTHER_QUESTION: 'Examiner',
  TRANSITION: 'Examiner',
  END: 'Examiner',
};

interface Props {
  entry: ConductLogEntry;
  voiceMuted: boolean;
  /** W3: this candidate turn's rail result, when the corrections rail has one (coached mode only). */
  railResult?: ExaminerFeedback | null;
  /** Scrolls to and highlights this turn's card in the corrections rail. */
  onIssueClick?: () => void;
}

interface QuoteSegment {
  text: string;
  matched: boolean;
}

/**
 * Splits a candidate transcript into plain/quoted segments from the rail's
 * ExaminerFeedback citations. Deliberately NOT MarkedUpScript/buildSegments
 * — those are built for FeedbackV2's `issues`/`transcriptAnnotations`
 * (category, severity, character-offset spans), and ExaminerFeedback is
 * prose claim/quote pairs with no such structure by design (ADR-0005;
 * mapping one into the other's shape was explicitly rejected — see
 * verification-log.md's W3 pre-implementation decision). This only finds
 * each quote's verbatim occurrence in the transcript and marks it clickable;
 * all quoted spans in a turn point at the same rail card, since
 * ExaminerFeedbackCard has no finer-grained per-citation anchor.
 */
function buildQuoteSegments(transcript: string, feedback: ExaminerFeedback): QuoteSegment[] {
  const quotes = [...feedback.currentDescriptorCommentary, ...feedback.improvementCommentary]
    .map((c) => c.quote)
    .filter(Boolean);

  const ranges: { start: number; end: number }[] = [];
  for (const quote of quotes) {
    const start = transcript.indexOf(quote);
    if (start === -1) continue;
    ranges.push({ start, end: start + quote.length });
  }
  ranges.sort((a, b) => a.start - b.start);

  const segments: QuoteSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // overlapping quote — keep the earlier one
    if (range.start > cursor) segments.push({ text: transcript.slice(cursor, range.start), matched: false });
    segments.push({ text: transcript.slice(range.start, range.end), matched: true });
    cursor = range.end;
  }
  if (cursor < transcript.length) segments.push({ text: transcript.slice(cursor), matched: false });
  return segments;
}

export function ExamTurnBubble({ entry, voiceMuted, railResult, onIssueClick }: Props) {
  const isExaminer = entry.kind === 'examiner';

  if (isExaminer) {
    const label = ACTION_LABEL[entry.action] ?? 'Examiner';
    const canReplay = hasFrenchVoice() && !voiceMuted;
    return (
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[85%]">
          <p className="text-eyebrow uppercase text-ink-subtle">{label}</p>
          <div className="relative rounded-card rounded-tl-none surface px-4 py-3">
            <p className="exam-serif text-body-l text-ink leading-snug">{entry.text}</p>
            {canReplay && (
              <button
                onClick={() => void speakExaminerText(entry.text, getExaminerVoiceGeneration())}
                aria-label="Replay examiner's line"
                className="absolute -bottom-3 right-3 flex items-center justify-center w-7 h-7 rounded-pill bg-action
                  text-action-ink shadow-sm hover:bg-action-hover transition-colors duration-state ease-smooth"
              >
                <Repeat size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const segments =
    railResult && onIssueClick ? buildQuoteSegments(entry.transcript, railResult) : [{ text: entry.transcript, matched: false }];

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-1 items-end max-w-[85%]">
        <p className="text-eyebrow uppercase text-ink-subtle">
          You{entry.inputMode === 'text' ? ' (typed)' : ''}
        </p>
        <div className="rounded-card rounded-tr-none bg-action text-action-ink px-4 py-3">
          <p className="text-body-base leading-snug">
            {segments.map((seg, i) =>
              seg.matched ? (
                <button
                  key={i}
                  type="button"
                  onClick={onIssueClick}
                  className="underline decoration-wavy decoration-2 underline-offset-2 decoration-action-ink/70 hover:opacity-80"
                >
                  {seg.text}
                </button>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
