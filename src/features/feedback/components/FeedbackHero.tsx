import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { Check, PenLine, Undo2 } from 'lucide-react';
import { enter, enterReduced, fill } from '../../../components/motion/variants';
import { coachScoreGrid, isUnscored, scoreFill, scoreTone } from '../../../domain/scoring';
import { cefrLevelLabel } from '../../../domain/learn/ability/levelLabel';
import { ladderScoreGrid, resolveMarkedScore, type MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import { LEVEL_MARKING_NOT_GRADED, LEVEL_MARKING_UNAVAILABLE, checkedAgainstLine } from '../../../domain/learn/marking/markingCopy';
import type { FeedbackV2 } from '../../../types';

/**
 * The top of the feedback screen, shared by both tabs: the overall score as a
 * ring that fills (the `fill` motion), the sub-scores as bars, the level and
 * length, and a tally of what the feedback found. It replaces the old score
 * line under the talk and the Full report's "Results" card, so the score is
 * shown once, in one place.
 *
 * It reads only what the feedback already holds (learn-marking §8.2: the
 * marked score through `resolveMarkedScore`), and the tally only counts claims
 * that already passed the filters — it never adds a verdict, band or grade.
 */

export interface FeedbackTally {
  strengths: number;
  fixes: number;
  selfCorrections: number;
}

interface Props {
  feedback: FeedbackV2;
  markingLevel?: MarkingLevel;
  tally: FeedbackTally;
  /** Makes each count a button that shows that part of the feedback. */
  onJump?: (to: TallyTarget) => void;
}

/** The grid's short labels, written out (the hero has the room). */
const FULL_LABEL: Record<string, string> = { Comm: 'Communication', Lang: 'Language' };

/** `scoreFill`'s thresholds as a stroke class (a CSS variable as a motion style does not update). */
const ringStroke = (v: number) => (v >= 8 ? 'stroke-progress' : v >= 6 ? 'stroke-reward' : 'stroke-correction');

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

/** A number that counts up with the ring (or is simply there under reduced motion). */
function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, { ...fill(0.22), onUpdate: setShown });
    return () => controls.stop();
  }, [value, reduced]);
  return <>{shown.toFixed(1)}</>;
}

function ScoreRing({ value, reduced }: { value: number; reduced: boolean }) {
  const offset = RING_C * (1 - Math.max(0, Math.min(10, value)) / 10);
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RING_R} fill="none" strokeWidth="8" className="stroke-track" />
        <motion.circle
          cx="50"
          cy="50"
          r={RING_R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          className={ringStroke(value)}
          initial={{ strokeDashoffset: reduced ? offset : RING_C }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : fill(0.22)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-testid="hero-overall" className="font-numeral text-num-m leading-none" style={{ color: scoreTone(value) }}>
          <CountUp value={value} reduced={reduced} />
        </span>
        <span className="mt-1 text-caption text-ink-subtle">out of 10</span>
      </div>
    </div>
  );
}

export type TallyTarget = 'strengths' | 'fixes' | 'self';

function TallyChips({ tally, onJump }: { tally: FeedbackTally; onJump?: (to: TallyTarget) => void }) {
  const chips = [
    tally.strengths > 0 && {
      key: 'strengths' as const,
      icon: Check,
      text: `${tally.strengths} ${tally.strengths === 1 ? 'strength' : 'strengths'}`,
      cls: 'bg-progress-soft text-progress-text',
    },
    {
      key: 'fixes' as const,
      icon: PenLine,
      text: tally.fixes === 0 ? 'No fixes needed' : `${tally.fixes} ${tally.fixes === 1 ? 'fix' : 'fixes'}`,
      cls: tally.fixes === 0 ? 'bg-progress-soft text-progress-text' : 'bg-correction-soft text-correction-text',
    },
    tally.selfCorrections > 0 && {
      key: 'self' as const,
      icon: Undo2,
      text: `${tally.selfCorrections} fixed yourself`,
      cls: 'bg-info-soft text-info-text',
    },
  ].filter(Boolean) as { key: TallyTarget; icon: typeof Check; text: string; cls: string }[];

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="What the feedback found">
      {chips.map(({ key, icon: Icon, text, cls }) => (
        <li key={key}>
          {onJump && !(key === 'fixes' && tally.fixes === 0) ? (
            <button
              type="button"
              onClick={() => onJump(key)}
              aria-label={`${text}: show`}
              className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label transition-colors duration-state hover:bg-surface-recessed active:scale-[.97] ${cls}`}
            >
              <Icon size={13} aria-hidden="true" />
              {text}
            </button>
          ) : (
            <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label ${cls}`}>
              <Icon size={13} aria-hidden="true" />
              {text}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FeedbackHero({ feedback, markingLevel, tally, onJump }: Props) {
  const reduced = useReducedMotion() ?? false;
  const { scores, wordCount, cefrLevel, levelCheck } = feedback;
  const level = cefrLevelLabel(cefrLevel);
  const unscored = isUnscored(feedback);
  const marked = resolveMarkedScore(feedback, markingLevel ?? 'exam');
  const overall = marked.score ?? scores.overall;
  const grid = levelCheck ? ladderScoreGrid(levelCheck.subScoresByLevel[marked.level]) : coachScoreGrid(scores);

  // learn-marking §8.3 — say which ladder the score was read against, or that no level was applied.
  const markingNote = !markingLevel ? null : (
    <p className="inline-flex items-center rounded-pill surface-recessed px-2.5 py-0.5 text-caption text-ink-muted">
      {unscored ? LEVEL_MARKING_NOT_GRADED : marked.levelMarked ? checkedAgainstLine(marked.level) : LEVEL_MARKING_UNAVAILABLE}
    </p>
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
      {level && <span className="rounded-pill bg-action-soft px-2 py-0.5 font-semibold text-action-text">{level}</span>}
      {wordCount != null && <span className="font-numeral">{wordCount} words</span>}
    </div>
  );

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      aria-label="Your result"
      data-testid="feedback-hero"
      className="rounded-card border border-hairline bg-surface-raised p-4 shadow-card sm:p-5"
    >
      {unscored ? (
        <div className="space-y-2">
          <p className="text-eyebrow uppercase text-ink-subtle">Your result</p>
          <p className="text-section text-ink">Practised offline — not graded</p>
          <p className="text-body-s text-ink-muted">
            No AI grader was reachable for this attempt, so no score was assigned. Your evidence and coaching tips below are still real.
          </p>
          {meta}
          {markingNote}
        </div>
      ) : (
        <div className="flex items-center gap-4 sm:gap-6">
          <ScoreRing value={overall} reduced={reduced} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-eyebrow uppercase text-ink-subtle">Overall</p>
              {meta}
            </div>
            <ul className="space-y-1.5" aria-label="Score by area">
              {grid.map(({ label, val }, i) => (
                <li key={label} className="grid grid-cols-[6.25rem_1fr_2rem] items-center gap-2">
                  <span className="truncate text-caption text-ink-muted">{FULL_LABEL[label] ?? label}</span>
                  <span className="h-1.5 overflow-hidden rounded-pill bg-track" aria-hidden="true">
                    <motion.span
                      className="block h-full rounded-pill"
                      style={{ background: scoreFill(val) }}
                      initial={{ width: reduced ? `${val * 10}%` : 0 }}
                      animate={{ width: `${val * 10}%` }}
                      transition={reduced ? { duration: 0 } : fill(0.3 + i * 0.08)}
                    />
                  </span>
                  <span className="text-right font-numeral text-label" style={{ color: scoreTone(val) }}>
                    {val.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!unscored && markingNote && <div className="mt-3">{markingNote}</div>}
      <div className="mt-3 border-t border-hairline pt-3">
        <TallyChips tally={tally} onJump={onJump} />
      </div>
    </motion.section>
  );
}
