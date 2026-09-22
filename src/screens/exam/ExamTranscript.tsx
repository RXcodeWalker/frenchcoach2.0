import { useEffect, useMemo, useRef } from 'react';
import { ExamTurnBubble } from './ExamTurnBubble';
import type { ConductLogEntry } from '../../domain/igcse/session/types';

interface Props {
  entries: ConductLogEntry[];
  voiceMuted: boolean;
  isAwaitingExaminer: boolean;
}

/**
 * Scrolling chat history, derived from the running session's ConductLog —
 * never a parallel mutable array (RoleplaySession.tsx's discipline). ADVANCE
 * entries (no utterance) and empty candidate turns (silence/skip/repeat —
 * already represented by the next examiner bubble) are dropped rather than
 * rendered as blank bubbles.
 */
export function ExamTranscript({ entries, voiceMuted, isAwaitingExaminer }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () =>
      entries.filter((e) => (e.kind === 'examiner' ? e.text.trim().length > 0 : e.transcript.trim().length > 0)),
    [entries],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, isAwaitingExaminer]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {visible.map((entry) => (
        <ExamTurnBubble key={`${entry.kind}-${entry.seq}`} entry={entry} voiceMuted={voiceMuted} />
      ))}
      {isAwaitingExaminer && (
        <div className="flex justify-start">
          <div className="flex gap-1 items-center rounded-card rounded-tl-none surface px-4 py-3">
            <span className="w-1.5 h-1.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
