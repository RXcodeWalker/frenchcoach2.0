import { motion } from 'framer-motion';
import { ProgressRing } from '../../components/ProgressRing';
import { Button } from '../../components/ui/Button';
import { fadeUp } from '../../components/motion/variants';
import type { DailyPlan } from '../../types/coach';

interface Props {
  todayCount: number;
  dailyGoal: number;
  dailyPlan: DailyPlan | null;
  onLearn: () => void;
  onExam: () => void;
}

/**
 * The single mission card (SCREENS §3): one --surface card, eyebrow
 * "Today's mission", title at `title`, one meta line, one 48px primary CTA.
 * The daily-goal ring uses --progress. No gradient fills, no glow, no scale
 * hover — exactly one primary action on the screen lives here.
 */
export function HeroMission({ todayCount, dailyGoal, dailyPlan, onLearn, onExam }: Props) {
  const remaining = Math.max(dailyGoal - todayCount, 0);
  const goalComplete = remaining === 0;

  return (
    <motion.div variants={fadeUp}>
      <div className="surface rounded-card p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="shrink-0 self-center sm:self-auto">
          <ProgressRing
            value={todayCount}
            max={dailyGoal}
            size={96}
            strokeWidth={8}
            color="var(--progress)"
            label={`${todayCount}/${dailyGoal}`}
            sublabel="sessions"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-eyebrow uppercase text-action-text">Today&rsquo;s mission</div>
          <h2 className="mt-2 text-title text-ink">
            {goalComplete
              ? 'Daily goal complete'
              : dailyPlan?.topAction.rationale ?? 'Complete a session to get your personalised focus for today.'}
          </h2>
          <p className="mt-1.5 text-body-s text-ink-subtle">
            {goalComplete
              ? `${todayCount} sessions done today — practise more to build your streak.`
              : `${remaining} more session${remaining > 1 ? 's' : ''} to hit your daily goal · about 12 min`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={onLearn}>
              Start session
            </Button>
            <Button variant="quiet" size="lg" onClick={onExam}>
              Take a timed test
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
