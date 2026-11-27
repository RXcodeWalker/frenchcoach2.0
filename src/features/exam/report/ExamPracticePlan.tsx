import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, Target } from 'lucide-react';
import { enter, enterReduced, stagger } from '../../../components/motion/variants';
import { AREA_LABEL, taskLabel, type PracticeItem, type PracticeRoute } from './examReport';

/**
 * "What to practise next": the scored areas ranked by the marks the envelope
 * did not award, each with the report's next step (once it is written) and a
 * way into practice that already exists. It reads marks; it never makes one.
 */

interface Props {
  items: PracticeItem[];
  /** Whether the post-marking report is still being written (its next steps are not in yet). */
  reportPending: boolean;
  onPractise?: (to: PracticeRoute) => void;
}

function listTasks(ids: string[]): string {
  const labels = ids.map(taskLabel);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function detailLine(item: PracticeItem): string | null {
  if (item.area === 'rolePlay' && item.tasksBelowFull.length > 0) {
    return `${listTasks(item.tasksBelowFull)} ${item.tasksBelowFull.length === 1 ? 'was' : 'were'} not fully credited.`;
  }
  if (item.area === 'qualityOfLanguage' && item.mistakeCount > 0) {
    const mistakes = `${item.mistakeCount} ${item.mistakeCount === 1 ? 'mistake' : 'mistakes'} to fix`;
    return item.topCategory && item.topCategory.count > 1
      ? `${mistakes}, most of them ${item.topCategory.label.toLowerCase()}.`
      : `${mistakes}.`;
  }
  return null;
}

export function ExamPracticePlan({ items, reportPending, onPractise }: Props) {
  const reduced = useReducedMotion() ?? false;
  const v = reduced ? enterReduced : enter;

  if (items.length === 0) {
    return (
      <motion.section
        variants={v}
        initial="hidden"
        animate="show"
        data-testid="exam-practice-plan"
        aria-label="What to practise next"
        className="flex items-center gap-3 rounded-card border border-hairline bg-progress-soft p-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-progress-text" aria-hidden="true">
          <Award size={20} />
        </span>
        <div>
          <p className="text-section text-ink">Every mark awarded</p>
          <p className="text-body-s text-ink-muted">No area lost a mark this time. Try another set to keep it up.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      animate="show"
      data-testid="exam-practice-plan"
      aria-labelledby="exam-plan-title"
      className="rounded-card border border-hairline-strong bg-surface p-4 shadow-card sm:p-5"
    >
      <motion.div variants={v} className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
          <Target size={18} />
        </span>
        <div>
          <h2 id="exam-plan-title" className="text-section text-ink">What to practise next</h2>
          <p className="text-caption text-ink-muted">Where the most marks are waiting, first.</p>
        </div>
      </motion.div>

      <ol className="mt-4 space-y-3">
        {items.map((item, i) => {
          const detail = detailLine(item);
          return (
            <motion.li
              key={item.area}
              variants={v}
              data-testid={`plan-${item.area}`}
              className={`rounded-control border p-3.5 ${i === 0 ? 'border-action bg-action-soft' : 'border-hairline surface-recessed'}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill font-numeral text-label ${
                    i === 0 ? 'bg-action text-action-ink' : 'bg-track text-ink'
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-section text-ink">{AREA_LABEL[item.area]}</h3>
                    <span className="rounded-pill bg-surface px-2 py-0.5 font-numeral text-caption text-ink-muted">
                      {item.lost} {item.lost === 1 ? 'mark' : 'marks'} to gain
                    </span>
                  </div>
                  {detail && <p className="text-body-s text-ink-muted">{detail}</p>}
                  {item.nextStep ? (
                    <p className="text-body-s text-ink">{item.nextStep.claim}</p>
                  ) : (
                    reportPending && <p className="text-caption text-ink-subtle">The examiner&rsquo;s next step is on its way.</p>
                  )}
                  {onPractise && (
                    <button
                      type="button"
                      onClick={() => onPractise(item.action.to)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-control text-label text-action-text transition-colors duration-state hover:text-ink active:scale-[.97]"
                    >
                      {item.action.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}
