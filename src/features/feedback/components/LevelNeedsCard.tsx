import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ListChecks, Quote } from 'lucide-react';
import { fadeUp, stagger } from '../../../components/motion/variants';
import {
  EXAM_STANDARD_NOTE,
  FIRST_STEP_LABEL,
  buildLevelNeedsView,
  meetsLine,
  needsHeading,
} from '../../../domain/learn/marking/markingCopy';
import type { MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import type { FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  /** The learner's marking level. Coach style only: the Examiner style is never given one. */
  markingLevel: MarkingLevel;
  /** The answer the example was built from. A linking word swapped against it is not shown. */
  transcript?: string;
}

// Items settle in one after another; under reduced motion they only fade (no travel).
const ITEM_FADE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } };

/**
 * learn-marking §6.1 — "What your answer needs for <level>": the rungs the
 * answer has not reached at the learner's level, each with a short example
 * built from their own words. Renders nothing when there is no level marking
 * (the score line already says so, §8.3) and a one-line pass when nothing is
 * missing. It reads only what the backend computed; it writes nothing.
 *
 * Colour comes from role tokens only (Learn Batch 5 guard): action for the
 * to-do list, progress for a pass, never a raw palette colour.
 */
export function LevelNeedsCard({ feedback, markingLevel, transcript }: Props) {
  const reduceMotion = useReducedMotion();
  const view = buildLevelNeedsView(feedback, markingLevel, transcript);
  if (view.kind === 'none') return null;

  if (view.kind === 'meets') {
    return (
      <motion.section
        variants={fadeUp}
        aria-label={meetsLine(view.level)}
        className="rounded-card bg-progress-soft border border-hairline p-4 space-y-1"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-progress-text shrink-0" aria-hidden="true" />
          <p className="text-label text-progress-text">{meetsLine(view.level)}</p>
        </div>
        {view.level === 'exam' && (
          <p className="text-body-s text-ink-muted pl-[26px]">{EXAM_STANDARD_NOTE}</p>
        )}
      </motion.section>
    );
  }

  const item = reduceMotion ? ITEM_FADE : fadeUp;

  return (
    <motion.section
      variants={fadeUp}
      aria-label={needsHeading(view.level)}
      className="rounded-card border border-hairline bg-surface overflow-hidden"
    >
      <header className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className="w-9 h-9 rounded-control bg-action-soft flex items-center justify-center shrink-0" aria-hidden="true">
          <ListChecks size={18} className="text-action-text" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-section text-ink">{needsHeading(view.level)}</h3>
          {view.level === 'exam' && (
            <p className="text-caption text-ink-muted mt-0.5">{EXAM_STANDARD_NOTE}</p>
          )}
        </div>
      </header>

      <motion.ul variants={stagger} initial="hidden" animate="show" className="px-4 pb-4 space-y-3">
        {view.items.map(need => (
          <motion.li
            key={need.ladder}
            variants={item}
            className={`border-l-2 pl-3 space-y-1.5 ${need.firstStep ? 'border-action' : 'border-hairline-strong'}`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-label text-ink">{need.label}</span>
              {need.firstStep && (
                <span className="text-caption font-semibold px-2 py-0.5 rounded-pill bg-action-soft text-action-text">
                  {FIRST_STEP_LABEL}
                </span>
              )}
            </div>
            <p className="text-body-s text-ink-muted">{need.text}</p>
            {need.example && (
              <p className="flex items-start gap-2 rounded-control surface-recessed px-3 py-2">
                <Quote size={13} className="text-action-text shrink-0 mt-[3px]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="sr-only">For example: </span>
                  <span lang="fr" className="text-body-s text-ink italic">{need.example}</span>
                </span>
              </p>
            )}
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
