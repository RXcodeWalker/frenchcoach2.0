import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateDailyPlan } from '../services/coach/decisionEngine';
import { getActiveRecommendation } from '../services/coach/recommendationEngine';
import { getSkillLabel } from '../services/coach/skillGraph';
import { getLastWeeklyReview, hasSeenWeeklyReviewThisWeek, markWeeklyReviewSeen } from '../services/coach/weeklyReviewService';
import type { CoachRecommendation, DailyPlan, WeeklyReview } from '../types/coach';
import { WeeklyReviewCard } from './progress/WeeklyReviewCard';
import { useApp } from '../context/AppContext';
import { getDailyStats, getStats } from '../services/analytics/analyticsService';
import { fadeUp } from '../components/motion/variants';
import { WeeklyChart } from '../components/WeeklyChart';
import { PageShell } from '../components/layout/PageShell';
import { HeroMission } from './home/HeroMission';
import { QuickAccess } from './home/QuickAccess';
import { RecentActivity } from './home/RecentActivity';
import { TopContextBar } from '../components/TopContextBar';

export function Home() {
  const { state } = useApp();
  const { profile } = state;
  const navigate = useNavigate();
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [showReviewBanner, setShowReviewBanner] = useState(false);

  const stats = useMemo(() => getStats(), []);
  const chartData = useMemo(() => getDailyStats(7), []);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.recentSessions.filter(s => s.createdAt?.startsWith(today)).length;

  const weakestTopic = useMemo(() => {
    const entries = Object.entries(stats.byTopic);
    if (!entries.length) return null;
    return entries.sort((a, b) => a[1].avg - b[1].avg)[0][0];
  }, [stats]);

  useEffect(() => {
    try {
      setDailyPlan(generateDailyPlan());
      setRecommendation(getActiveRecommendation());
    } catch {
      // Non-critical — Home still renders without a coach plan
    }
    const review = getLastWeeklyReview();
    if (review) {
      setWeeklyReview(review);
      const isSunday = new Date().getDay() === 0;
      if (isSunday || !hasSeenWeeklyReviewThisWeek()) {
        setShowReviewBanner(true);
      }
    }
  }, []);

  const handleDismissReview = () => {
    markWeeklyReviewSeen();
    setShowReviewBanner(false);
  };

  const coachSkillIds = recommendation?.targetSkillIds?.length
    ? recommendation.targetSkillIds
    : dailyPlan?.topAction.targetSkillIds ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <TopContextBar
        title="Today"
        subtitle={`Welcome back, ${profile.username ?? 'French Learner'}`}
      />

      <PageShell>
        <div className="space-y-6 pb-24 md:pb-8">
          {/* The one mission card — the only primary action on the screen */}
          <HeroMission todayCount={todayCount} onLearn={() => navigate('/learn')} onExam={() => navigate('/exam')} />

          {showReviewBanner && weeklyReview && (
            <WeeklyReviewCard
              review={weeklyReview}
              variant="banner"
              onDismiss={handleDismissReview}
            />
          )}

          {/* 2-up: continue topic / weak skill — --surface cards, no primary,
              the whole card is the link (Component Kit §02) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              type="button"
              variants={fadeUp}
              onClick={() => navigate('/learn')}
              className="surface rounded-card p-5 text-left transition-colors duration-state ease-smooth
                hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]"
            >
              <div className="text-eyebrow uppercase text-action-text">Your coach picked this</div>
              <h3 className="mt-2 text-subtitle text-ink">
                {dailyPlan?.topAction.targetTopicKey ?? weakestTopic ?? 'Justify an opinion, in the past'}
              </h3>
              <p className="mt-1.5 text-body-s text-ink-muted line-clamp-2">
                {dailyPlan?.explanation ??
                  'Three questions pitched just above what you managed last session.'}
              </p>
              {coachSkillIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {coachSkillIds.slice(0, 3).map(id => (
                    <span
                      key={id}
                      className="text-eyebrow uppercase rounded-pill border border-hairline-strong px-2 py-0.5 text-ink-subtle"
                    >
                      {getSkillLabel(id)}
                    </span>
                  ))}
                </div>
              )}
            </motion.button>

            <motion.button
              type="button"
              variants={fadeUp}
              onClick={() => navigate('/learn')}
              className="surface rounded-card p-5 text-left transition-colors duration-state ease-smooth
                hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]"
            >
              <div className="text-eyebrow uppercase text-ink-subtle">Weakest topic</div>
              <h3 className="mt-2 text-subtitle text-ink">{weakestTopic ?? 'General practice'}</h3>
              <p className="mt-1.5 text-body-s text-ink-muted">
                {weakestTopic
                  ? 'Your lowest-scoring topic — target it to raise your overall score.'
                  : 'Complete some sessions to unlock a personalised topic focus.'}
              </p>
            </motion.button>
          </div>

          {/* Stats & activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div variants={fadeUp} className="surface rounded-card p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-subtitle text-ink">This week</h3>
                  <span className="font-numeral text-body-s text-ink-subtle tabular-nums">
                    avg {stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
                  </span>
                </div>
                <WeeklyChart data={chartData} uid="home" />
              </motion.div>

              <RecentActivity sessions={state.recentSessions} />
            </div>

            <div className="space-y-6">
              <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {[
                  { value: profile.streak_days, label: 'Day streak' },
                  { value: profile.total_xp.toLocaleString(), label: 'Total XP' },
                  { value: stats.avgScore != null ? stats.avgScore.toFixed(1) : '—', label: 'Avg score' },
                  { value: state.achievements.filter(a => a.unlocked).length, label: 'Badges' },
                ].map(stat => (
                  <div key={stat.label} className="surface-recessed rounded-card p-4">
                    <p className="font-numeral text-title text-ink tabular-nums">{stat.value}</p>
                    <p className="text-eyebrow uppercase text-ink-subtle mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>

              <QuickAccess onNavigate={(screen) => navigate(screen === 'home' ? '/' : `/${screen}`)} />
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
