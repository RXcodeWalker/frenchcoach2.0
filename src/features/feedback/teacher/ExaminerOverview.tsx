import { motion, useReducedMotion } from 'framer-motion';
import { Check, Footprints, GraduationCap, PenLine } from 'lucide-react';
import { enter, enterReduced, fill } from '../../../components/motion/variants';
import { ERROR_CATEGORY_LABELS } from '../../../domain/examFeedback/shared/errorCategories';
import type { LearnExaminerFeedback } from '../../../services/coaching/examinerFeedback';
import { errorCategories } from './examinerAnswer';

/**
 * The top of the Examiner style's feedback, above its two tabs: what the
 * examiner found, as counts the learner can tap, and where the mistakes
 * cluster. ADR 0005: no mark, band, grade or total — the counts only restate
 * claims that already passed the filters, and nothing here ranks the answer.
 */

export type ExaminerJump = 'strengths' | 'fixes' | 'look-for';

/** Segment colours for the mistakes-by-type bar, in rank order (role tokens only). */
const SWATCH = ['bg-correction', 'bg-reward', 'bg-action', 'bg-info-text', 'bg-progress', 'bg-ink-subtle'];

interface Props {
  result: LearnExaminerFeedback;
  wordCount: number;
  onJump: (to: ExaminerJump) => void;
}

export function ExaminerOverview({ result, wordCount, onJump }: Props) {
  const reduced = useReducedMotion() ?? false;
  const strengths = result.strengths.length;
  const errors = result.errors.length;
  const types = errorCategories(result.errors);

  const chips = [
    strengths > 0 && {
      key: 'strengths' as const,
      icon: Check,
      text: `${strengths} ${strengths === 1 ? 'thing that worked' : 'things that worked'}`,
      cls: 'bg-progress-soft text-progress-text',
    },
    {
      key: 'fixes' as const,
      icon: PenLine,
      text: errors === 0 ? 'No mistakes to fix' : `${errors} ${errors === 1 ? 'mistake' : 'mistakes'} to fix`,
      cls: errors === 0 ? 'bg-progress-soft text-progress-text' : 'bg-correction-soft text-correction-text',
    },
    result.nextStep && { key: 'look-for' as const, icon: Footprints, text: 'Your next step', cls: 'bg-action-soft text-action-text' },
  ].filter(Boolean) as { key: ExaminerJump; icon: typeof Check; text: string; cls: string }[];

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      aria-label="Examiner commentary"
      data-testid="examiner-overview"
      className="space-y-3 rounded-card border border-hairline bg-surface-raised p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-reward-soft text-reward-text" aria-hidden="true">
          <GraduationCap size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase text-ink-subtle">Examiner commentary</p>
          <p className="text-section text-ink">What the examiner noticed</p>
        </div>
        {wordCount > 0 && <span className="shrink-0 font-numeral text-caption text-ink-muted">{wordCount} words</span>}
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="What the examiner found">
        {chips.map(({ key, icon: Icon, text, cls }) => (
          <li key={key}>
            {key === 'fixes' && errors === 0 ? (
              <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label ${cls}`}>
                <Icon size={13} aria-hidden="true" />
                {text}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onJump(key)}
                aria-label={`${text}: show`}
                className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label transition-colors duration-state hover:bg-surface-recessed ${cls}`}
              >
                <Icon size={13} aria-hidden="true" />
                {text}
              </button>
            )}
          </li>
        ))}
      </ul>

      {types.length > 0 && (
        <div className="space-y-2 border-t border-hairline pt-3" data-testid="examiner-types">
          <p className="text-caption text-ink-muted">Where the mistakes are</p>
          {errors > 1 && (
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-pill" aria-hidden="true">
              {types.map((t, i) => (
                <motion.span
                  key={t.category}
                  className={`h-full ${SWATCH[i % SWATCH.length]}`}
                  initial={{ width: reduced ? `${(t.count / errors) * 100}%` : 0 }}
                  animate={{ width: `${(t.count / errors) * 100}%` }}
                  transition={reduced ? { duration: 0 } : fill(0.25 + i * 0.06)}
                />
              ))}
            </div>
          )}
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Mistakes by type">
            {types.map((t, i) => (
              <li key={t.category} className="flex items-center gap-1.5 text-caption text-ink-muted">
                <span className={`h-2 w-2 rounded-pill ${SWATCH[i % SWATCH.length]}`} aria-hidden="true" />
                {ERROR_CATEGORY_LABELS[t.category]} <span className="font-numeral text-ink">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-caption text-ink-subtle">Practice commentary in an examiner’s words. It never gives a score.</p>
    </motion.section>
  );
}
