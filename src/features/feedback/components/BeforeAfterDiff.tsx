import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Wand2 } from 'lucide-react';
import { correct, enter, enterReduced } from '../../../components/motion/variants';
import { diffWords, attachChangeAnnotations, type AnnotatedDiffOp } from '../../../domain/learn/feedback/buildChanges';
import type { CoachingIssue } from '../../../types';

interface Props {
  transcript: string;
  improvedAnswer?: string;
  changes?: import('../../../types').FeedbackV2['changes'];
  /** Fallback when there is no complete improved_answer (docs Stage 4 invariant #11). */
  issues?: CoachingIssue[];
  /** Card heading; the coach view calls it "Say it better" (Learn Batch 4). */
  title?: string;
  /** Actions under the rewrite (hear it / practise it). */
  children?: ReactNode;
}

/**
 * One changed stretch of the improved answer: only the new words, in green,
 * dropping in with the `correct` motion in reading order. The crossed-out
 * originals are not repeated here — "Your answer, marked up" already shows them
 * (owner, 2026-11-13). A pure deletion shows nothing; tap a word that has a
 * reason to see why it changed.
 */
function DiffChip({ op, order, reduced }: { op: AnnotatedDiffOp; order: number; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const hasExplanation = !!op.annotation;
  if (op.type === 'delete') return null;

  return (
    <motion.span
      className="inline"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : correct.fix(0.15 + order * 0.12)}
    >
      {hasExplanation ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-sm bg-progress-soft px-0.5 font-semibold text-progress-text underline decoration-progress-text decoration-dotted underline-offset-4"
        >
          {op.afterText}
        </button>
      ) : (
        <span className="rounded-sm bg-progress-soft px-0.5 font-semibold text-progress-text">{op.afterText}</span>
      )}
      {hasExplanation && open && (
        <span className="mb-1 mt-1 block rounded-control border border-hairline bg-action-soft px-2.5 py-1.5 text-body-s text-action-text">
          {op.annotation!.explanation}
        </span>
      )}
    </motion.span>
  );
}

function SafeCorrectionsList({ issues }: { issues: CoachingIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {issues.map(issue => (
        <div key={issue.id} className="flex items-start gap-1.5 rounded-control surface-recessed p-2 text-body-s">
          <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-progress-text" />
          <div>
            {issue.quote && <span className="mr-1 text-ink-muted line-through">{issue.quote}</span>}
            <span className="font-semibold text-progress-text">{issue.correction}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BeforeAfterDiff({ transcript, improvedAnswer, changes, issues = [], title = 'Before → After', children }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [showMine, setShowMine] = useState(false);
  // No complete improved_answer -> no diff, ever (docs Stage 4 invariant #11,
  // Stage 5: "it falls back to the Safe corrections individual-correction
  // presentation. A diff implies an authoritative corrected answer exists;
  // it must never appear when one does not.")
  if (!improvedAnswer) {
    if (issues.length === 0) return null;
    return (
      <motion.div variants={reduced ? enterReduced : enter} initial="hidden" animate="show" className="rounded-card border border-hairline bg-surface p-4">
        <p className="mb-2.5 text-eyebrow uppercase text-ink-subtle">Safe Corrections</p>
        <SafeCorrectionsList issues={issues} />
      </motion.div>
    );
  }

  const ops = diffWords(transcript, improvedAnswer, { ignoreCaseAndPunctuation: true });
  const annotated = attachChangeAnnotations(ops, changes ?? []);
  const hasChange = annotated.some(op => op.type !== 'equal');
  if (!hasChange) return null;
  let order = 0;

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      aria-label={title}
      className="rounded-card border border-hairline bg-surface p-4"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-progress-soft text-progress-text" aria-hidden="true">
          <Wand2 size={14} />
        </span>
        <p className="min-w-0 flex-1 text-section text-ink">{title}</p>
      </div>
      <p lang="fr" className="text-body-base leading-relaxed text-ink">
        {annotated.map((op, i) =>
          op.type === 'equal' ? <span key={i}>{op.afterText}</span> : <DiffChip key={i} op={op} order={order++} reduced={reduced} />,
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-ink-muted">
          {annotated.some(op => op.annotation) ? 'Changes are in green. Tap an underlined word for why.' : 'Changes are in green.'}
        </p>
        <button
          type="button"
          onClick={() => setShowMine((v) => !v)}
          aria-expanded={showMine}
          className="text-label text-action-text underline-offset-2 hover:underline"
        >
          {showMine ? 'Hide your answer' : 'Compare with yours'}
        </button>
      </div>
      {showMine && (
        <p lang="fr" className="mt-2 rounded-control surface-recessed px-3 py-2.5 text-body-s text-ink-muted">
          {transcript}
        </p>
      )}
      {children && <div className="mt-3 border-t border-hairline pt-3">{children}</div>}
    </motion.section>
  );
}
