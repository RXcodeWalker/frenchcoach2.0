import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { generateDailyPlan } from '../services/coach/decisionEngine';
import { getActiveRecommendation } from '../services/coach/recommendationEngine';
import { getSkillLabel } from '../services/coach/skillGraph';
import { getDueReviewCounts } from '../services/coach/reviewPool';
import { getLastWeeklyReview, hasSeenWeeklyReviewThisWeek, markWeeklyReviewSeen } from '../services/coach/weeklyReviewService';
import type { CoachRecommendation, DailyPlan, WeeklyReview } from '../types/coach';
import { WeeklyReviewCard } from './progress/WeeklyReviewCard';
import { useApp } from '../context/AppContext';
import { getDailyStats, getStats } from '../services/analytics/analyticsService';
import { levelProgress } from '../services/progression/progressionService';
import { computeXPGain } from '../domain/xp';
import { LEARN_ANSWERS_PER_DAY } from '../features/learn/dailyAllowance';
import { learnTopicPath } from '../features/progress/progressSummary';
import { TOPICS } from '../data/gameData';
import { fadeUp, fill } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { useIsDesktop } from '../components/layout/useIsDesktop';
import { TopContextBar } from '../components/TopContextBar';
import { HeroMission, type PlanStep } from './home/HeroMission';
import { CoachPick } from './home/CoachPick';
import { ThisWeek, type WeekDay } from './home/ThisWeek';
import { RecentActivity } from './home/RecentActivity';

// The ring's count the last time Home rendered, so finishing a session and
// landing back here fills the ring from the old count (the `fill` motion).
let lastTodayCount: number | null = null;

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Home (Design System v2, frame 2a). Desktop: greeting + level, the mission
 * card (the screen's only primary), coach's pick, then this week beside
 * recent activity. Mobile: the same, compact — a 74px ring, plan tiles, a
 * focus strip, a week strip and single-line activity rows.
 */
export function Home() {
  const { state } = useApp();
  const { profile } = state;
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [showReviewBanner, setShowReviewBanner] = useState(false);

  const stats = useMemo(() => getStats(), []);
  const week: WeekDay[] = useMemo(
    () => getDailyStats(7).map(d => ({ day: d.day, avg: d.scoredSessions > 0 ? d.score : null })),
    [],
  );
  const dueTotal = useMemo(() => Object.values(getDueReviewCounts()).reduce((a, b) => a + b, 0), []);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.recentSessions.filter(s => s.createdAt?.startsWith(today)).length;
  const ringFrom = useRef(lastTodayCount !== null && lastTodayCount < todayCount ? lastTodayCount : todayCount).current;
  useEffect(() => { lastTodayCount = todayCount; }, [todayCount]);

  const weakestTopic = useMemo(() => {
    const entries = Object.entries(stats.byTopic);
    if (!entries.length) return null;
    return entries.sort((a, b) => a[1].avg - b[1].avg)[0];
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
  const skills = coachSkillIds.slice(0, 3).map(getSkillLabel);

  // Coach's pick: the plan's topic when it names one, else the weakest-scoring topic.
  const planTopic = dailyPlan?.topAction.targetTopicKey ?? recommendation?.targetTopicKey ?? null;
  const pickKey = planTopic ?? weakestTopic?.[0] ?? null;
  const pickTopic = TOPICS.find(t => t.key === pickKey) ?? null;
  const pickBody = dailyPlan?.explanation
    ?? (weakestTopic
      ? `Your lowest average so far — ${weakestTopic[1].avg.toFixed(1)} across ${weakestTopic[1].count} answers. A session here lifts your overall score fastest.`
      : 'Record a few answers and your coach will pick the topic to work on next.');
  const pickShort = weakestTopic && !planTopic
    ? `lowest average so far (${weakestTopic[1].avg.toFixed(1)}).`
    : dailyPlan?.topAction.rationale ?? 'answer a few questions to get a focus.';
  const openPick = () => navigate(pickKey ? learnTopicPath(pickKey) : '/learn');

  const focusSkill = skills[0];
  const plan: PlanStep[] = [
    { title: 'Warm up', sub: 'A question at your level' },
    dueTotal > 0
      ? { title: 'Review', sub: `${dueTotal} answer${dueTotal === 1 ? '' : 's'} due for review` }
      : { title: 'Build on it', sub: 'Same topic, one step on' },
    { title: 'Stretch', sub: focusSkill ? `${focusSkill} · a step up` : 'A step above your level' },
  ];

  const coachPick = (compact: boolean) => (
    <CoachPick
      compact={compact}
      topicKey={pickKey}
      topicLabel={pickTopic?.label ?? null}
      tag={planTopic ? 'Today’s focus' : weakestTopic ? 'Weakest topic' : null}
      body={pickBody}
      short={pickShort}
      skills={skills}
      onOpen={openPick}
    />
  );

  const xpUpTo = LEARN_ANSWERS_PER_DAY * computeXPGain(10, profile.streak_days).gain;
  const level = levelProgress(profile.total_xp);
  const name = profile.username?.trim();

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Today" subtitle={todayLabel()} />

      <PageShell maxWidth="home" gap={desktop ? 24 : 12}>
        <motion.div
          variants={fadeUp}
          className={`flex flex-wrap justify-between gap-x-8 gap-y-3 ${desktop ? 'mb-2 items-end' : 'items-center px-1 pb-2'}`}
        >
          <h1 className={desktop ? 'text-[clamp(40px,6cqw,60px)] font-semibold leading-none tracking-[-0.035em] text-ink' : 'text-h2 text-ink'}>
            {name ? <>Salut, <span lang="fr">{name}</span>.</> : 'Salut.'}
          </h1>
          <div className="flex min-w-0 max-w-[320px] flex-[1_1_240px] flex-col gap-1.5" data-testid="home-level">
            <span className="flex items-baseline justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-reward-text">
                <Zap size={14} aria-hidden="true" />Level {level.n}
              </span>
              <span className="font-numeral text-[13px] text-ink-subtle">
                {level.toNext === null ? 'Top level' : `${level.toNext.toLocaleString('en-GB')} XP to Level ${level.n + 1}`}
              </span>
            </span>
            <span className={`block overflow-hidden rounded-pill bg-track ${desktop ? 'h-2' : 'h-1.5'}`}>
              <motion.span
                className="block h-full rounded-pill bg-reward"
                initial={{ width: 0 }}
                animate={{ width: `${level.fraction * 100}%` }}
                transition={fill()}
              />
            </span>
          </div>
        </motion.div>

        <HeroMission
          todayCount={todayCount}
          dailyGoal={state.dailyGoal}
          dailyPlan={dailyPlan}
          streakDays={profile.streak_days}
          xpUpTo={xpUpTo}
          plan={plan}
          compact={!desktop}
          ringFrom={ringFrom}
          footer={desktop ? undefined : coachPick(true)}
          onLearn={() => navigate('/learn')}
          onExam={() => navigate('/exam')}
        />

        {desktop && coachPick(false)}

        {showReviewBanner && weeklyReview && (
          <WeeklyReviewCard review={weeklyReview} onDismiss={handleDismissReview} />
        )}

        {desktop ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-4">
            <ThisWeek days={week} />
            <RecentActivity sessions={state.recentSessions} />
          </div>
        ) : (
          <>
            <ThisWeek days={week} compact />
            <RecentActivity sessions={state.recentSessions} compact />
          </>
        )}
      </PageShell>
    </div>
  );
}
