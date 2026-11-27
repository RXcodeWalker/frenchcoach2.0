import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enter, enterReduced, fill } from '../../../components/motion/variants';
import { ClaimRow, FixRow, PointSection, type FeedbackPoint } from '../components/FeedbackPointList';
import type { TeacherLine } from './buildTeacherScript';
import { SecondTake } from './SecondTake';
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
 *  - The Second take (Batch 6c) is placed by the script and rendered here, so
 *    it shares the one-microphone rule with the nudges.
 *  - Nothing outside this block waits on it: Next / Get new feedback are not inside it.
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
  /** Called once a Second take has produced a result (the learner said something). */
  onSecondTake?: () => void;
  /**
   * Rendered at the end of the conversation, only once everything has been
   * revealed and the "Say it better" rewrite is no longer held back — so an offer
   * to keep that rewrite never appears before the learner can see it.
   */
  after?: ReactNode;
}

const INTERACTIVE = 'button, input, textarea, select, a, label';
/** The microphone owner key of the Second take (fix nudges use their quote). */
const SECOND_TAKE_MIC = '\u0000second-take';

function Avatar() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-action text-caption font-semibold text-action-ink"
    >
      {teacherInitials()}
    </span>
  );
}

function LearnerBubble({ text, quotes }: { text: string; quotes: string[] }) {
  const segments = markQuotes(text, quotes);
  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-eyebrow uppercase text-ink-subtle" aria-hidden="true">Your answer</p>
      <p lang="fr" className="max-w-[90%] rounded-card rounded-br-sm bg-action-soft px-4 py-3 text-body-s text-ink">
        {segments.map((s, i) =>
          s.marked ? (
            <mark key={i} className="bg-transparent text-ink underline decoration-correction-text decoration-wavy decoration-2 underline-offset-4">
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

export function TeacherConversation({ lines, revealKey, tryFirstHeading, renderSection, highlightedQuote, onSecondTake, after }: Props) {
  const unitCounts = useMemo(() => lines.map((l) => (l.kind === 'talk' ? typingUnits(l.text).length : 0)), [lines]);
  const reduced = useReducedMotion() ?? false;
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
    () =>
      lines
        .filter((l): l is Extract<TeacherLine, { kind: 'talk' }> => l.kind === 'talk')
        .map((l) => (l.question ? `${l.question.prompt} You answered ${l.question.answer}. ${l.text}` : l.text))
        .join(' '),
    [lines],
  );
  const [announced, setAnnounced] = useState('');
  useEffect(() => setAnnounced(talkText), [talkText]);

  const pointGroups = useMemo(
    () => lines.flatMap((l) => (l.kind === 'points' ? [l.group] : [])),
    [lines],
  );

  const visibleLines = lines.slice(0, reveal.visible);
  // The fixes the teacher has reached so far, underlined in the learner's own words.
  const quotes = visibleLines.flatMap((l) =>
    l.kind === 'points' ? l.group.points.filter((p): p is Fix => p.kind === 'fix').map((p) => p.quote) : [],
  );

  const renderLine = (line: TeacherLine, i: number): ReactNode => {
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
            {continuing ? <span className="w-8 shrink-0" aria-hidden="true" /> : <Avatar />}
            <div className="min-w-0 space-y-0.5">
              {!continuing && (
                <p className="text-eyebrow uppercase text-ink-muted" aria-hidden="true">
                  {TEACHER_NAME}
                </p>
              )}
              {line.question && <PredictQuestion prompt={line.question.prompt} answer={line.question.answer} />}
              <p
                aria-hidden="true"
                data-role={line.role}
                className="rounded-card rounded-tl-sm border border-hairline bg-surface-raised px-4 py-3 text-body-s text-ink shadow-card"
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
          <div key={line.id} className="pl-10">
            <PointSection
              heading={line.group.heading}
              tone={line.group.tone}
              compact={false}
              aside={nudge ? <TriedMeter tried={nudgeQuotes.filter((q) => resolved.has(q)).length} total={nudgeQuotes.length} reduced={reduced} /> : undefined}
            >
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
        if (line.section === 'second-take') {
          return (
            <div key={line.id} className="pl-10">
              <SecondTake
                groups={pointGroups}
                micLocked={micOwner !== null && micOwner !== SECOND_TAKE_MIC}
                onMicActive={(active) => setMicOwner(active ? SECOND_TAKE_MIC : null)}
                onTaken={onSecondTake}
              />
            </div>
          );
        }
        return (
          <div key={line.id} className="pl-10">
            {line.section === 'say-it-better' && holdSayItBetter ? (
              <p className="rounded-card border border-dashed border-hairline-strong px-4 py-3 text-body-s text-ink-muted">
                Your improved answer appears here once you've tried the fixes above, or tapped "Just show me".
              </p>
            ) : (
              renderSection?.(line.section)
            )}
          </div>
        );
    }
  };

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

      {visibleLines.map((line, i) => (
        // Each line rises in as the teacher reaches it (the `enter` motion; a fade under reduced motion).
        <motion.div key={line.id} variants={reduced ? enterReduced : enter} initial="hidden" animate="show">
          {renderLine(line, i)}
        </motion.div>
      ))}

      {done && !holdSayItBetter && after ? <div className="pl-10">{after}</div> : null}

      {!done && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={skip}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-muted underline underline-offset-2"
          >
            Show all
          </button>
        </div>
      )}
    </section>
  );
}

/** "1 of 2 tried" with a small bar that fills (the `fill` motion) — how far through the first fixes the learner is. */
function TriedMeter({ tried, total, reduced }: { tried: number; total: number; reduced: boolean }) {
  if (total < 1) return null;
  const pct = `${(tried / total) * 100}%`;
  return (
    <span className="flex shrink-0 items-center gap-2" data-testid="tried-meter">
      <span className="font-numeral text-caption text-ink-muted">
        {tried} of {total} tried
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-pill bg-track" aria-hidden="true">
        <motion.span
          className="block h-full rounded-pill bg-progress"
          initial={false}
          animate={{ width: pct }}
          transition={reduced ? { duration: 0 } : fill(0)}
        />
      </span>
    </span>
  );
}

/**
 * The Predict question a calibration reply answers, quoted above it: without
 * it "and you did: « parce que »" has no context once the checks are gone.
 */
function PredictQuestion({ prompt, answer }: { prompt: string; answer: 'yes' | 'no' }) {
  return (
    <p aria-hidden="true" data-testid="predict-question" className="flex flex-wrap items-baseline gap-x-1.5 text-caption text-ink-muted">
      <span className="font-semibold text-ink">{prompt}</span>
      <span>You said {answer === 'yes' ? 'Yes' : 'No'}.</span>
    </p>
  );
}
