import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { PlanDay, WeekPlan } from '../../services/coach/weekPlan';
import { PLAN_DAY_VISUAL } from './planDayVisual';

interface Props {
  plan: WeekPlan;
  onOpen: (to: string) => void;
  compact?: boolean;
  /** Shows a "Full plan" link to My Plan (/plan) when given. */
  onOpenPlan?: () => void;
}


function Cell({ day, onOpen }: { day: PlanDay; onOpen: (to: string) => void }) {
  const k = PLAN_DAY_VISUAL[day.kind];
  const Icon = k.icon;
  const body = (
    <>
      <span className={`block text-center text-caption ${day.isToday ? 'font-semibold text-action-text' : 'text-ink-subtle'}`}>
        {day.isToday ? 'Today' : day.weekday}
      </span>
      <span className={`flex h-9 w-9 items-center justify-center rounded-control ${k.chip}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="line-clamp-2 min-h-[2lh] text-center text-caption font-medium leading-tight text-ink">{day.label}</span>
    </>
  );
  const cls = `flex min-h-[104px] min-w-0 flex-col items-center gap-1.5 rounded-control px-1.5 py-2 ${
    day.isToday ? 'shadow-[inset_0_0_0_1.5px_var(--action)]' : 'shadow-[inset_0_0_0_1px_var(--hairline)]'
  }`;
  const aria = `${day.isToday ? 'Today' : day.weekday}: ${k.name}${day.label !== k.name ? `, ${day.label}` : ''}. ${day.detail}`;

  return day.to ? (
    <button
      type="button"
      onClick={() => onOpen(day.to as string)}
      aria-label={aria}
      title={day.detail}
      className={`${cls} transition-colors duration-state ease-smooth hover:bg-track`}
    >
      {body}
    </button>
  ) : (
    <div role="group" aria-label={aria} title={day.detail} className={cls}>{body}</div>
  );
}

function summary(plan: WeekPlan): string {
  const answers = plan.days.reduce((a, d) => a + d.learnAnswers, 0);
  const parts: string[] = [];
  if (plan.examSimIndex !== null) parts.push('1 Exam Sim');
  if (answers > 0) parts.push(`up to ${answers} marked answers`);
  return parts.join(' · ');
}

/**
 * The coach's week (Home, under the mission): seven days built backwards from
 * the exam and the usage limits (services/coach/weekPlan.ts). Today is today's
 * mission. Cells scroll sideways on a phone rather than shrinking the labels
 * below 12px. Only the `enter` motion (shared with the other Home cards).
 */
export function PlanWeek({ plan, onOpen, compact = false, onOpenPlan }: Props) {
  const total = summary(plan);
  return (
    <motion.section
      variants={fadeUp}
      aria-label="Your week"
      className={`flex flex-col rounded-card border border-hairline bg-surface ${compact ? 'gap-3 px-4 py-4' : 'gap-4 p-6'}`}
      data-testid="home-plan-week"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={compact ? 'text-[14px] font-semibold text-ink' : 'text-section text-ink'}>Your week</h2>
        <span className="flex items-baseline gap-3">
          {total && <span className="font-numeral text-[13px] text-ink-subtle">{total}</span>}
          {onOpenPlan && (
            <button
              type="button"
              onClick={onOpenPlan}
              className="-my-2 inline-flex min-h-11 items-center gap-0.5 text-[13px] font-medium text-action-text"
              data-testid="home-plan-week-full"
            >
              Full plan<ChevronRight size={14} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      <div
        className="grid auto-cols-[minmax(76px,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1"
        data-testid="home-plan-week-days"
      >
        {plan.days.map(d => <Cell key={d.date} day={d} onOpen={onOpen} />)}
      </div>
    </motion.section>
  );
}
