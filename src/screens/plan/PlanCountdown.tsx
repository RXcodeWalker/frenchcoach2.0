import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Flag } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { CountUp } from '../../components/motion/CountUp';
import type { Countdown, Road } from '../../features/myPlan/planModel';
import { longDay, plural } from './formatDay';

const STAGE_NAME = {
  build: 'Build',
  sharpen: 'Sharpen',
  exam_month: 'Exam month',
  final_week: 'Final week',
  exam_day: 'Exam day',
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      variants={fadeUp}
      aria-label="Your exam"
      className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,28px)]"
      data-testid="plan-countdown"
    >
      {children}
    </motion.section>
  );
}

/** Where a learner without a usable exam date fixes it: the goal editor in Profile. */
function SetDate({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <Button variant="secondary" size="sm" onClick={() => navigate('/profile')} data-testid="plan-set-exam-date">
      {label}
    </Button>
  );
}

/**
 * The top of My Plan: how many days are left and which stage of the coach's
 * plan the learner is in. Without a date it asks for one — it never guesses.
 */
export function PlanCountdown({ countdown, road }: { countdown: Countdown; road: Road | null }) {
  if (countdown.kind === 'no_exam') {
    return (
      <Shell>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted" aria-hidden="true">
          <Flag size={20} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h2 className="text-title text-ink">No exam on your plan</h2>
          <p className="text-body-s text-ink-muted [text-wrap:pretty]">
            Your goal isn’t a speaking exam, so there is no countdown. The week below still follows your own answers.
          </p>
        </div>
        <SetDate label="Change goal" />
      </Shell>
    );
  }
  if (countdown.kind === 'no_date') {
    return (
      <Shell>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
          <CalendarClock size={20} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h2 className="text-title text-ink">Add your exam date</h2>
          <p className="text-body-s text-ink-muted [text-wrap:pretty]">
            With a date I can lay out every stage from now to the exam and place your Exam Sims on it.
          </p>
        </div>
        <SetDate label="Add exam date" />
      </Shell>
    );
  }
  if (countdown.kind === 'after_exam') {
    return (
      <Shell>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted" aria-hidden="true">
          <Flag size={20} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h2 className="text-title text-ink">Your exam date has passed</h2>
          <p className="text-body-s text-ink-muted [text-wrap:pretty]">
            It was {longDay(countdown.examDay)}. If another exam is coming, set its date and the plan starts again.
          </p>
        </div>
        <SetDate label="Set a new date" />
      </Shell>
    );
  }

  const { daysLeft, examDay, stage } = countdown;
  const current = road?.stages.find(s => s.current);
  return (
    <Shell>
      <div className="flex flex-col gap-0.5">
        {daysLeft === 0 ? (
          <span className="font-numeral text-num-l text-ink">Today</span>
        ) : (
          <span className="flex items-baseline gap-2">
            <CountUp value={daysLeft} className="font-numeral text-num-xl text-ink" data-testid="plan-days-left" />
            <span className="text-body-s text-ink-muted">{daysLeft === 1 ? 'day to go' : 'days to go'}</span>
          </span>
        )}
        <span className="text-[13px] text-ink-subtle">Exam · {longDay(examDay)}</span>
      </div>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        <span className="inline-flex w-fit items-center rounded-pill bg-action-soft px-3 py-1 text-[13px] font-semibold text-action-text">
          You are in: {STAGE_NAME[stage]}
        </span>
        {current && <p className="text-body-s text-ink [text-wrap:pretty]">{current.focus}</p>}
        {road && !road.examLocked && (
          <p className="text-[13px] text-ink-subtle">
            {road.simDates.length > 0
              ? `${plural(road.simDates.length, 'Exam Sim')} on the plan before the exam — one every 7 days.`
              : 'No room for another Exam Sim before the exam — the plan is review and role plays.'}
          </p>
        )}
      </div>
    </Shell>
  );
}
