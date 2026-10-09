import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ClaimRow, FixRow, PointSection, type FeedbackPoint } from '../components/FeedbackPointList';
import type { TeacherLine } from './buildTeacherScript';
import { markQuotes } from './markQuotes';
import { TEACHER_NAME, teacherInitials } from './persona';
import { SpeakButton } from './SpeakButton';
import { TryItFirst } from './TryItFirst';
import { typedPrefix, typingUnits } from './typing';
import { useTypedReveal } from './useTypedReveal';

/**
 * The teacher's conversation (Learn feedback Batch 6b): the filtered feedback as
 * chat bubbles from one named teacher. Presentation and pacing only — every
 * line comes from `buildTeacherScript`, which only arranges claims that already
 * survived the filters, and nothing here is a mark, band or grade (ADR 0005).
 *
 *  - Only the English talk is typed; quotes and corrections appear whole.
 *  - Tap, Space or "Show all" reveals everything at once; reduced motion shows
 *    it at once; an attempt that has already played never types again.
 *  - The typed text is aria-hidden; the full talk goes once to a polite live
 *    region.
 *  - As each fix appears, its words are underlined in the learner's own bubble.
 *  - Every correction has a "hear it" button; the Coach's first fixes start as
 *    "Try it first" nudges. The "Say it better" rewrite holds back until each
 *    nudge has been tried or shown — it contains the corrected phrases, so
 *    showing it first would answer them. (The Full report is one tap away and
 *    shows everything; this only protects the offer to have a go.)
 *  - Nothing outside this block waits on it: Next / Try again are not inside it.
 */

type Fix = Extract<FeedbackPoint, { kind: 'fix' }>;

interface Props {
  lines: TeacherLine[];
  /** One object per attempt (the feedback itself); the reveal plays once per key. */
  revealKey: object;
  /** The group whose fixes start as "Try it first" nudges (the Coach's "Fix these first"). */
  tryFirstHeading?: string;
  /** The existing cards the script places: the Say-it-better diff and Go further. */
  renderSection?: (section: 'say-it-better' | 'go-further') => ReactNode;
  highlightedQuote?: string | null;
}

const INTERACTIVE = 'button, input, textarea, select, a, label';

function Avatar() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action-soft border border-hairline text-[10px] font-black text-action-text"
    >
      {teacherInitials()}
    </span>
  );
}

function LearnerBubble({ text, quotes }: { text: string; quotes: string[] }) {
  const segments = markQuotes(text, quotes);
  return (
    <div className="flex justify-end">
      <p className="max-w-[88%] rounded-2xl rounded-br-sm surface-recessed px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted">
        {segments.map((s, i) =>
          s.marked ? (
            <mark key={i} className="bg-transparent text-ink underline decoration-correction-text decoration-2 underline-offset-2">
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  );
}

export function TeacherConversation({ lines, revealKey, tryFirstHeading, renderSection, highlightedQuote }: Props) {
  const unitCounts = useMemo(() => lines.map((l) => (l.kind === 'talk' ? typingUnits(l.text).length : 0)), [lines]);
  const reveal = useTypedReveal(revealKey, unitCounts);
  const { skip, done } = reveal;
  const [micOwner, setMicOwner] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ReadonlySet<string>>(new Set());
  const nudgeQuotes = lines.flatMap((l) =>
    l.kind === 'points' && tryFirstHeading && l.group.heading === tryFirstHeading
      ? l.group.points.filter((p): p is Fix => p.kind === 'fix').map((p) => p.quote)
      : [],
  );
  const holdSayItBetter = nudgeQuotes.some((q) => !resolved.has(q));

  // Space shows everything, unless the key is meant for a control or a text field.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return;
      e.preventDefault();
      skip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [done, skip]);

  // The full talk goes to a polite live region once, after mount (a region that is
  // filled at first paint is often not announced).
  const talkText = useMemo(
    () => lines.filter((l): l is Extract<TeacherLine, { kind: 'talk' }> => l.kind === 'talk').map((l) => l.text).join(' '),
    [lines],
  );
  const [announced, setAnnounced] = useState('');
  useEffect(() => setAnnounced(talkText), [talkText]);

  const visibleLines = lines.slice(0, reveal.visible);
  // The fixes the teacher has reached so far, underlined in the learner's own words.
  const quotes = visibleLines.flatMap((l) =>
    l.kind === 'points' ? l.group.points.filter((p): p is Fix => p.kind === 'fix').map((p) => p.quote) : [],
  );

  return (
    <section
      aria-label={`${TEACHER_NAME}'s feedback`}
      className="space-y-2.5"
      onClick={(e) => {
        if (!done && e.target instanceof Element && !e.target.closest(INTERACTIVE)) skip();
      }}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announced}
      </div>

      {visibleLines.map((line, i) => {
        const prev = visibleLines[i - 1];
        const typing = i === reveal.visible - 1 && !done;
        switch (line.kind) {
          case 'learner':
            return <LearnerBubble key={line.id} text={line.text} quotes={quotes} />;

          case 'talk': {
            const text = typing ? typedPrefix(line.text, reveal.units) : line.text;
            const continuing = prev?.kind === 'talk';
            return (
              <div key={line.id} className="flex gap-2">
                {continuing ? <span className="w-7 shrink-0" aria-hidden="true" /> : <Avatar />}
                <div className="min-w-0 space-y-0.5">
                  {!continuing && (
                    <p className="text-eyebrow uppercase text-ink-muted" aria-hidden="true">
                      {TEACHER_NAME}
                    </p>
                  )}
                  <p
                    aria-hidden="true"
                    data-role={line.role}
                    className="rounded-2xl rounded-tl-sm surface-raised px-3.5 py-2.5 text-xs leading-relaxed text-ink"
                  >
                    {text}
                  </p>
                </div>
              </div>
            );
          }

          case 'points': {
            const nudge = !!tryFirstHeading && line.group.heading === tryFirstHeading;
            return (
              <div key={line.id} className="pl-9">
                <PointSection heading={line.group.heading} tone={line.group.tone} compact={false}>
                  {line.group.points.map((p, j) =>
                    p.kind === 'claim' ? (
                      <ClaimRow key={j} point={p} compact={false} hl={highlightedQuote} />
                    ) : nudge ? (
                      <TryItFirst
                        key={j}
                        fix={p}
                        highlightedQuote={highlightedQuote}
                        micLocked={micOwner !== null && micOwner !== p.quote}
                        onMicActive={(active) => setMicOwner(active ? p.quote : null)}
                        onResolved={() => setResolved((r) => new Set(r).add(p.quote))}
                      />
                    ) : (
                      <FixRow key={j} point={p} compact={false} hl={highlightedQuote} action={<SpeakButton text={p.correction} />} />
                    ),
                  )}
                </PointSection>
              </div>
            );
          }

          case 'section':
            return (
              <div key={line.id} className="pl-9">
                {line.section === 'say-it-better' && holdSayItBetter ? (
                  <p className="text-[11px] text-ink-muted">
                    Your improved answer appears here once you've tried the fixes above, or tapped "Just show me".
                  </p>
                ) : (
                  renderSection?.(line.section)
                )}
              </div>
            );
        }
      })}

      {!done && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={skip}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted underline underline-offset-2"
          >
            Show all
          </button>
        </div>
      )}
    </section>
  );
}
