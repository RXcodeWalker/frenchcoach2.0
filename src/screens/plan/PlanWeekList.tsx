import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { WeekPlan } from '../../services/coach/weekPlan';
import { PLAN_DAY_VISUAL } from '../home/planDayVisual';
import { plural, weekdayDay } from './formatDay';

/**
 * This week, day by day: the same seven days as Home's strip (weekPlan.ts),
 * with room for each day's sentence. Today is the mission; every other day
 * opens where its practice starts.
 */
export function PlanWeekList({ plan, onOpen }: { plan: WeekPlan; onOpen: (to: string) => void }) {
  const answers = plan.days.reduce((a, d) => a + d.learnAnswers, 0);
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="plan-week"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="plan-week"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="plan-week" className="text-section text-ink">This week</h2>
        <span className="font-numeral text-[13px] text-ink-subtle">
          {[plan.examSimIndex !== null ? '1 Exam Sim' : null, answers > 0 ? `up to ${plural(answers, 'marked answer')}` : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <ol className="flex flex-col">
        {plan.days.map(day => {
          const v = PLAN_DAY_VISUAL[day.kind];
          const Icon = v.icon;
          const body = (
            <>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${v.chip}`} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`text-[13px] ${day.isToday ? 'font-semibold text-action-text' : 'text-ink-subtle'}`}>
                    {day.isToday ? 'Today' : weekdayDay(day.date)}
                  </span>
                  <span className="text-[15px] font-semibold text-ink">{day.label}</span>
                </span>
                <span className="text-body-s text-ink-muted [text-wrap:pretty]">{day.detail}</span>
              </span>
            </>
          );
          const row = 'flex items-start gap-3 py-3';
          return (
            <li key={day.date} data-testid={`plan-day-${day.index}`} className="border-t border-hairline first:border-t-0">
              {day.to ? (
                <button
                  type="button"
                  onClick={() => onOpen(day.to as string)}
                  className={`${row} w-full rounded-control text-left transition-colors duration-state ease-smooth hover:bg-track`}
                >
                  {body}
                  <ChevronRight size={16} className="mt-3 shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}
