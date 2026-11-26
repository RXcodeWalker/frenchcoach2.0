import { motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { Road } from '../../features/myPlan/planModel';
import { dayRange, plural, shortDay } from './formatDay';

/**
 * The road to the exam: the coach's stages (build → sharpen → exam month →
 * final week → exam day) from today on, with real dates and the Exam Sims the
 * one-every-7-days window leaves room for. A plan, not a promise of a mark.
 */
export function PlanRoad({ road }: { road: Road }) {
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="plan-road"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="plan-road"
    >
      <div className="flex flex-col gap-1">
        <h2 id="plan-road" className="text-section text-ink">The road to your exam</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          Each stage changes what your coach puts first. The plan moves with your answers; the dates don’t.
        </p>
      </div>
      <ol className="flex flex-col">
        {road.stages.map((stage, i) => {
          const last = i === road.stages.length - 1;
          return (
            <li key={stage.key} className="flex gap-3" data-testid={`plan-stage-${stage.key}`} aria-current={stage.current ? 'step' : undefined}>
              <span className="flex w-4 shrink-0 flex-col items-center" aria-hidden="true">
                <span
                  className="mt-1.5 block h-3 w-3 shrink-0 rounded-pill"
                  style={{
                    background: stage.current ? 'var(--action)' : 'var(--surface)',
                    boxShadow: stage.current ? 'none' : 'inset 0 0 0 1.5px var(--hairline-strong)',
                  }}
                />
                {!last && <span className="block w-px flex-1 bg-hairline-strong" />}
              </span>
              <div className={`flex min-w-0 flex-1 flex-col gap-1 ${last ? '' : 'pb-5'}`}>
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={`text-[15px] font-semibold ${stage.current ? 'text-action-text' : 'text-ink'}`}>{stage.title}</span>
                  <span className="font-numeral text-[13px] text-ink-subtle">{dayRange(stage.from, stage.to)}</span>
                  {stage.current && <span className="text-caption font-semibold uppercase text-action-text">You are here</span>}
                </span>
                <p className="text-body-s text-ink-muted [text-wrap:pretty]">{stage.focus}</p>
                {stage.simDates.length > 0 && (
                  <p className="inline-flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
                    <ClipboardCheck size={14} className="shrink-0 text-action-text" aria-hidden="true" />
                    {plural(stage.simDates.length, 'Exam Sim')}: {stage.simDates.map(shortDay).join(', ')}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {road.examLocked && (
        <p className="text-[13px] text-ink-subtle">Exam Sims join the plan once exam practice unlocks (five finished Junior missions).</p>
      )}
    </motion.section>
  );
}
