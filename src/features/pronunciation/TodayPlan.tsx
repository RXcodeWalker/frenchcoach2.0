import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { enter, enterReduced } from '../../components/motion/variants';
import { TODAY_INTRO, TODAY_TITLE, todayDoneLine, type PlanStep, type PlanStepKind } from '../../domain/pronunciation/lab/todayPlan';

/**
 * "Today's 5 minutes" (the Lab home's one primary action): the short ordered
 * plan from `buildTodayPlan`, each step a row that opens the thing it names and
 * comes back here. Ticks are held by the screen for this sitting only; nothing
 * is stored, scored or sent.
 */

interface Props {
  steps: readonly PlanStep[];
  done: ReadonlySet<PlanStepKind>;
  onStart: (step: PlanStep) => void;
}

export function TodayPlan({ steps, done, onStart }: Props) {
  const reduced = useReducedMotion() ?? false;
  const doneCount = steps.filter((s) => done.has(s.kind)).length;
  const next = steps.find((s) => !done.has(s.kind));
  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-label={TODAY_TITLE}
      data-testid="today-plan"
    >
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-action-text">Practice plan</p>
        <h1 className="text-h1 text-ink">{TODAY_TITLE}</h1>
        <p className="text-body-s text-ink-muted">{TODAY_INTRO}</p>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isDone = done.has(step.kind);
          const isNext = next?.kind === step.kind;
          return (
            <li key={step.kind}>
              <button
                type="button"
                onClick={() => onStart(step)}
                data-testid={`plan-${step.kind}`}
                aria-label={`${i + 1}. ${step.title}${isDone ? ' — done' : ''}. ${step.note}`}
                className={`flex w-full items-center gap-3 rounded-card border p-4 text-left text-ink transition-colors duration-state ease-smooth
                  ${isNext ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:border-hairline-strong'} active:bg-surface-recessed`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-[14px] font-semibold
                    ${isDone ? 'bg-progress-soft text-progress-text' : 'border border-hairline-strong bg-surface text-ink-muted'}`}
                  aria-hidden="true"
                >
                  {isDone ? <Check size={18} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{step.title}</span>
                  <span className="text-[13px] text-ink-subtle">{isDone ? 'Done — tap to do it again' : step.note}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>

      <p className={`text-body-s ${doneCount >= steps.length ? 'text-progress-text' : 'text-ink-muted'}`} role="status">
        {todayDoneLine(doneCount, steps.length)}
      </p>
    </motion.section>
  );
}
