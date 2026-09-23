import { useEffect, useMemo, useRef } from 'react';
import { ExamTurnBubble } from './ExamTurnBubble';
import type { ConductLogEntry } from '../../domain/igcse/session/types';
import type { RailEntry } from '../../services/exam/turnFeedback';

interface Props {
  entries: ConductLogEntry[];
  voiceMuted: boolean;
  isAwaitingExaminer: boolean;
  /** W3: rail results keyed by candidate turnKey (== entry.seq), for the wavy-underline -> rail-card wiring. */
  railEntries?: RailEntry[];
  onIssueClick?: (turnKey: number) => void;
}

/**
 * Scrolling chat history, derived from the running session's ConductLog —
 * never a parallel mutable array (RoleplaySession.tsx's discipline). ADVANCE
 * entries (no utterance) and empty candidate turns (silence/skip/repeat —
 * already represented by the next examiner bubble) are dropped rather than
 * rendered as blank bubbles.
 */
export function ExamTranscript({ entries, voiceMuted, isAwaitingExaminer, railEntries, onIssueClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () =>
      entries.filter((e) => (e.kind === 'examiner' ? e.text.trim().length > 0 : e.transcript.trim().length > 0)),
    [entries],
  );

  const railByTurnKey = useMemo(() => {
    const map = new Map<number, RailEntry>();
    for (const e of railEntries ?? []) map.set(e.turnKey, e);
    return map;
  }, [railEntries]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, isAwaitingExaminer]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {visible.map((entry) => {
        const railEntry = entry.kind === 'candidate' ? railByTurnKey.get(entry.seq) : undefined;
        return (
          <ExamTurnBubble
            key={`${entry.kind}-${entry.seq}`}
            entry={entry}
            voiceMuted={voiceMuted}
            railResult={railEntry?.status === 'done' ? railEntry.result : undefined}
            onIssueClick={railEntry && onIssueClick ? () => onIssueClick(railEntry.turnKey) : undefined}
          />
        );
      })}
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
