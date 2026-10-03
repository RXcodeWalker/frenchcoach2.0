import { Repeat } from 'lucide-react';
import { speakExaminerText, getExaminerVoiceGeneration, hasFrenchVoice } from '../../services/exam/examinerVoice';
import type { ConductLogEntry } from '../../domain/igcse/session/types';
import { collectExaminerQuoteItems, type ExaminerFeedback } from '../../services/coaching/examinerFeedback';

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
  onIssueClick?: (quote: string) => void;
}

interface QuoteSegment {
  text: string;
  matched: boolean;
  kind?: 'mistake' | 'good';
}

/**
 * Splits a candidate transcript into plain/quoted segments from the rail's
 * ExaminerFeedback citations (collectExaminerQuotes). Deliberately NOT MarkedUpScript/buildSegments
 * — those are built for FeedbackV2's `issues`/`transcriptAnnotations`
 * (category, severity, character-offset spans), and ExaminerFeedback is
 * prose claim/quote pairs and quote/correction/category items with no
 * character offsets by design (ADR-0005;
 * mapping one into the other's shape was explicitly rejected — see
 * verification-log.md's W3 pre-implementation decision). This only finds
 * each quote's verbatim occurrence in the transcript and marks it clickable;
 * the rail card anchors each row by its quote, so a click passes the quote
 * and the rail scrolls to and highlights that exact row.
 */
function buildQuoteSegments(transcript: string, feedback: ExaminerFeedback): QuoteSegment[] {
  const items = collectExaminerQuoteItems(feedback).filter((i) => i.quote);

  const ranges: { start: number; end: number; kind: 'mistake' | 'good' }[] = [];
  for (const { quote, kind } of items) {
    const start = transcript.indexOf(quote);
    if (start === -1) continue;
    const existing = ranges.find((r) => r.start === start && r.end === start + quote.length);
    // The same words cited as both fine and wrong: the mistake wins.
    if (existing) {
      if (kind === 'mistake') existing.kind = 'mistake';
      continue;
    }
    ranges.push({ start, end: start + quote.length, kind });
  }
  ranges.sort((a, b) => a.start - b.start);

  const segments: QuoteSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // overlapping quote — keep the earlier one
    if (range.start > cursor) segments.push({ text: transcript.slice(cursor, range.start), matched: false });
    segments.push({ text: transcript.slice(range.start, range.end), matched: true, kind: range.kind });
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
                  onClick={() => onIssueClick?.(seg.text)}
                  title={seg.kind === 'mistake' ? 'Mistake — see the correction' : 'Correct — see the examiner note'}
                  className={`inline m-0 border-0 border-b-2 rounded-sm px-0.5 font-inherit text-inherit align-baseline cursor-pointer
                    transition-colors duration-state ease-smooth ${
                      seg.kind === 'mistake'
                        ? 'bg-orange-300/25 border-orange-300 hover:bg-orange-300/40'
                        : 'bg-emerald-300/25 border-emerald-300 hover:bg-emerald-300/40'
                    }`}
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
