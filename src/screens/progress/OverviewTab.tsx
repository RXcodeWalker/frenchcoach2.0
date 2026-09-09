import { motion } from 'framer-motion';
import { ProgressRing } from '../../components/ProgressRing';
import { Stat } from '../../components/ui/Stat';
import { getLevelInfo } from '../../domain/levels';
import { getDailyStats } from '../../services/analytics/analyticsService';
import { fadeUp } from '../../components/motion/variants';
import type { UserProfile } from '../../types/index';

interface Props {
  profile: UserProfile;
}

export function OverviewTab({ profile }: Props) {
  const { current, progress } = getLevelInfo(profile.total_xp);
  const dailyStats = getDailyStats(7);
  const scoredDays = dailyStats.filter((d) => d.scoredSessions > 0);
  const weeklyAvg = scoredDays.length
    ? scoredDays.reduce((s, d) => s + d.score, 0) / scoredDays.length
    : null;

  // 6-bar sparkline — achievement in --progress on --track, no context line.
  const bars = dailyStats.slice(-6);
  const maxBar = Math.max(...bars.map((b) => b.score), 1);

  return (
    <>
      <motion.div variants={fadeUp} className="surface rounded-card p-5">
        <div className="flex items-center gap-6 flex-wrap">
          <ProgressRing
            value={progress}
            max={100}
            size={120}
            strokeWidth={8}
            color="var(--progress)"
            label={`${Math.round(progress)}`}
            sublabel={`to ${current.icon} ${current.level}`}
          />
          <div className="flex-1 min-w-[200px] space-y-4">
            <div className="flex flex-wrap gap-2">
              <Stat role="reward">{profile.total_xp.toLocaleString()} XP</Stat>
              <Stat role="streak">{profile.streak_days} days</Stat>
              <Stat role="neutral">{profile.sessions_count} sessions</Stat>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-end gap-1.5 h-16">
                {bars.map((b, i) => (
                  <div key={i} className="flex-1 rounded-pill bg-track overflow-hidden flex items-end">
                    <motion.div
                      className="w-full rounded-pill bg-progress"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.round((b.score / maxBar) * 100)}%` }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-s text-ink-subtle">Last 6 days</span>
                <span className="font-numeral text-body-s text-ink-subtle tabular-nums">
                  {weeklyAvg === null ? 'no scores yet' : `avg ${weeklyAvg.toFixed(1)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
