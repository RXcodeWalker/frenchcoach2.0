import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mic, Zap } from 'lucide-react';
import { ProgressRing } from '../../components/ProgressRing';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { fadeUp } from '../../components/motion/variants';
import type { DailyPlan } from '../../types/coach';

export interface PlanStep {
  title: string;
  sub: string;
}

interface Props {
  todayCount: number;
  dailyGoal: number;
  dailyPlan: DailyPlan | null;
  onLearn: () => void;
  onExam: () => void;
  /** Current streak, for the streak line. */
  streakDays?: number;
  /** The most XP today's session can earn (3 marked answers at the top score). */
  xpUpTo?: number;
  /** Today's plan — three steps under the card (desktop) or as mini tiles (compact). */
  plan?: PlanStep[];
  /** The compact mobile stage: a 74px ring and mini plan tiles. */
  compact?: boolean;
  /** Where the ring animates from (sessions done before the last one), for the post-session fill. */
  ringFrom?: number;
  /** Compact only: a recessed strip along the bottom of the card (the coach's focus). */
  footer?: ReactNode;
}

function streakLine(streak: number, todayCount: number): string {
  if (streak <= 0) return 'Start a streak today';
  if (todayCount > 0) return `${streak}-day streak · safe today`;
  return `Keep your ${streak}-day streak`;
}

/**
 * Today's mission (Home 2a): the daily-goal ring, the mission title and meta,
 * the XP and streak stakes, the screen's one primary (Start session) beside a
 * secondary timed test, and a recessed "Today's plan" strip.
 */
export function HeroMission({
  todayCount, dailyGoal, dailyPlan, onLearn, onExam, streakDays = 0, xpUpTo, plan = [], compact = false, ringFrom, footer,
}: Props) {
  const remaining = Math.max(dailyGoal - todayCount, 0);
  const goalComplete = remaining === 0;
  const title = goalComplete
    ? 'Daily goal complete'
    : dailyPlan?.topAction.rationale ?? 'Complete a session to get your personalised focus for today.';
  const meta = goalComplete
    ? `${todayCount} session${todayCount === 1 ? '' : 's'} done today — practise more to build your streak.`
    : `${remaining} more session${remaining > 1 ? 's' : ''} to hit your daily goal · about 12 min`;

  const ring = (
    <ProgressRing
      value={todayCount}
      max={dailyGoal}
      from={ringFrom}
      size={compact ? 74 : 96}
      strokeWidth={8}
      label={`${todayCount}/${dailyGoal}`}
      sublabel={goalComplete ? 'goal met' : 'sessions'}
    />
  );

  const stakes = (
    <div className="flex flex-wrap gap-2">
      {xpUpTo != null && (
        <Stat role="reward" soft icon={<Zap size={14} />}>Up to +{xpUpTo} XP</Stat>
      )}
      <Stat role="streak" icon={<Flame size={14} />}>
        <span className="font-sans">{streakLine(streakDays, todayCount)}</span>
      </Stat>
    </div>
  );

  if (compact) {
    return (
      <motion.section variants={fadeUp} className="overflow-hidden rounded-card border border-hairline bg-surface" data-testid="home-mission">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5">
          {ring}
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
            <span className="text-eyebrow uppercase text-action-text">Today&rsquo;s mission</span>
            <h2 className="text-[18px] font-semibold leading-[1.35] text-ink">{title}</h2>
            <p className="text-[13px] text-ink-subtle">{meta}</p>
            <div className="mt-1.5">{stakes}</div>
            {plan.length > 0 && (
              <ol className="mt-2.5 grid grid-cols-3 gap-1.5">
                {plan.map((p, i) => (
                  <li key={p.title} className="flex min-w-0 flex-col gap-0.5 rounded-control border border-hairline bg-surface-recessed px-2.5 py-2">
                    <span className="font-numeral text-caption text-action-text">{i + 1}</span>
                    <span className="truncate text-[13px] font-semibold leading-tight text-ink">{p.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" onClick={onLearn}>
              <Mic size={16} aria-hidden="true" />Start session
            </Button>
            <Button variant="secondary" size="lg" onClick={onExam}>Timed test</Button>
          </div>
        </div>
        {footer != null && <div className="border-t border-hairline bg-surface-recessed">{footer}</div>}
      </motion.section>
    );
  }

  return (
    <motion.section variants={fadeUp} className="overflow-hidden rounded-card border border-hairline bg-surface" data-testid="home-mission">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6 p-[clamp(20px,4cqw,32px)]">
        {ring}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <span className="text-eyebrow uppercase text-action-text">Today&rsquo;s mission</span>
          <h2 className="text-title text-ink [text-wrap:pretty]">{title}</h2>
          <p className="text-body-s text-ink-muted">{meta}</p>
          <div className="mt-1">{stakes}</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={onLearn}>
              <Mic size={16} aria-hidden="true" />Start session
            </Button>
            <Button variant="secondary" size="lg" onClick={onExam}>Take a timed test</Button>
          </div>
        </div>
      </div>
      {plan.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-hairline bg-surface-recessed px-[clamp(20px,4cqw,32px)] pb-5 pt-4">
          <div className="flex justify-between gap-3 text-eyebrow uppercase text-ink-subtle">
            <span>Today&rsquo;s plan</span>
            <span className="text-caption normal-case tracking-normal">{todayCount > 0 ? `${todayCount} done today` : 'Pick any topic'}</span>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2">
            {plan.map((p, i) => (
              <li key={p.title} className="flex min-w-0 items-center gap-3 rounded-control border border-hairline bg-surface p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-action-soft font-numeral text-[14px] text-action-text">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[14px] font-semibold leading-[1.3] text-ink">{p.title}</span>
                  <span className="text-caption text-ink-subtle">{p.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.section>
  );
}
