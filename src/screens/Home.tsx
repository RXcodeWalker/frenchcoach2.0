import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { localDay, localDayOf } from '../lib/localDay';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { generateDailyPlan } from '../services/coach/decisionEngine';
import { getActiveRecommendation } from '../services/coach/recommendationEngine';
import { getSkillLabel } from '../services/coach/skillGraph';
import { getDueReviewCounts } from '../services/coach/reviewPool';
import { getCoachBrief } from '../services/coach/coachBriefInput';
import type { CoachMoveKind } from '../services/coach/coachBrain';
import { getLastWeeklyReview, hasSeenWeeklyReviewThisWeek, markWeeklyReviewSeen } from '../services/coach/weeklyReviewService';
import type { CoachRecommendation, DailyPlan, WeeklyReview } from '../types/coach';
import { WeeklyReviewCard } from './progress/WeeklyReviewCard';
import { useApp } from '../context/AppContext';
import { getDailyStats, getStats } from '../services/analytics/analyticsService';
import { levelProgress } from '../services/progression/progressionService';
import { computeXPGain } from '../domain/xp';
import { LEARN_ANSWERS_PER_DAY } from '../features/learn/dailyAllowance';
import { learnTopicPath } from '../features/progress/progressSummary';
import { TOPICS } from '../data/topics';
import { fadeUp, fill } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { useIsDesktop } from '../components/layout/useIsDesktop';
import { TopContextBar } from '../components/TopContextBar';
import { HeroMission, type PlanStep } from './home/HeroMission';
import { CoachPick } from './home/CoachPick';
import { ThisWeek, type WeekDay } from './home/ThisWeek';
import { HomeworkCard } from '../features/homework/HomeworkCard';
import { RecentActivity } from './home/RecentActivity';

// The ring's count the last time Home rendered, so finishing a session and
// landing back here fills the ring from the old count (the `fill` motion).
let lastTodayCount: number | null = null;

/** The eyebrow on the coach's card: why this move, in two words. */
const MOVE_TAG: Record<CoachMoveKind, string> = {
  first_steps: 'Getting started',
  fix_mistake: 'Recurring mistake',
  exam_sim: 'Weekly Exam Sim',
  role_play: 'Role play',
  develop_answers: 'Weakest exam area',
  weak_skill: 'Weakest skill',
  review: 'Due for review',
  new_topic: 'New topic',
  keep_going: 'Keep going',
};

/** Where a move without a topic happens — the card's heading, so it doesn't repeat the mission title. */
const MOVE_PLACE: Partial<Record<CoachMoveKind, string>> = {
  first_steps: 'Learn',
  exam_sim: 'Exam Sim · full 0520 speaking test',
  role_play: 'Role-play drill',
};

function firstSentence(text: string): string {
  const m = /^.+?[.!?](?=\s|$)/.exec(text);
  return m ? m[0] : text;
}

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
  // Today's AI-marked Learn answers left (read-only lookup); null while unknown.
  const [answersLeft, setAnswersLeft] = useState<number | null>(null);

  const stats = useMemo(() => getStats(), []);
  const week: WeekDay[] = useMemo(
    () => getDailyStats(7).map(d => ({ day: d.day, avg: d.scoredSessions > 0 ? d.score : null })),
    [],
  );
  const dueTotal = useMemo(() => Object.values(getDueReviewCounts()).reduce((a, b) => a + b, 0), []);

  const today = localDay();
  const todayCount = state.recentSessions.filter(s => s.createdAt && localDayOf(s.createdAt) === today).length;
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

  useEffect(() => {
    let live = true;
    // apiClient is loaded on demand so Home opens without the Learn pipeline (code splitting).
    void import('../services/api/apiClient')
      .then(m => m.getLearnAllowance())
      .then(a => { if (live && a) setAnswersLeft(a.remaining); }, () => {});
    return () => { live = false; };
  }, []);

  // The coach's one decision (coachBrain.ts): what to do now, why, and where.
  // Recomputed when a session lands or the allowance arrives; pure and cheap.
  const brief = useMemo(
    () => getCoachBrief({ learnAnswersLeft: answersLeft }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentSessions.length marks "a session landed"
    [answersLeft, state.recentSessions.length],
  );

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
  const fallbackPlan: PlanStep[] = [
    { title: 'Warm up', sub: 'A question at your level' },
    dueTotal > 0
      ? { title: 'Review', sub: `${dueTotal} answer${dueTotal === 1 ? '' : 's'} due for review` }
      : { title: 'Build on it', sub: 'Same topic, one step on' },
    { title: 'Stretch', sub: focusSkill ? `${focusSkill} · a step up` : 'A step above your level' },
  ];

  const move = brief?.move ?? null;
  const moveTopic = move?.topicKey ? TOPICS.find(t => t.key === move.topicKey) ?? null : null;
  const plan: PlanStep[] = brief?.steps ?? fallbackPlan;

  const coachPick = (compact: boolean) => move ? (
    <CoachPick
      compact={compact}
      topicKey={move.topicKey}
      topicLabel={moveTopic?.label ?? null}
      heading={MOVE_PLACE[move.kind] ?? move.title}
      tag={MOVE_TAG[move.kind]}
      body={move.why}
      short={firstSentence(move.why)}
      skills={brief?.signals ?? []}
      onOpen={() => navigate(move.to)}
    />
  ) : (
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

  const alternatives = brief?.alternatives ?? [];
  const otherOptions = alternatives.length > 0 && (
    <motion.nav variants={fadeUp} aria-label="Other options" className="flex flex-wrap items-center gap-2 px-1" data-testid="home-coach-alternatives">
      <span className="text-caption text-ink-subtle">Or:</span>
      {alternatives.map(a => (
        <button
          key={a.kind}
          type="button"
          onClick={() => navigate(a.to)}
          title={a.why}
          className="inline-flex min-h-9 items-center rounded-pill border border-hairline-strong px-3 text-[13px] font-medium text-ink-muted transition-colors duration-state ease-smooth hover:bg-track"
        >
          {a.title}
        </button>
      ))}
    </motion.nav>
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
          title={move?.title}
          note={brief?.headline}
          primary={move ? { label: move.cta, onClick: () => navigate(move.to) } : undefined}
          planNote={move ? moveTopic?.labelEn ?? MOVE_PLACE[move.kind] ?? null : null}
          secondary={move?.kind === 'exam_sim'
            ? { label: desktop ? 'Practise in Learn' : 'Learn', onClick: () => navigate('/learn') }
            : undefined}
        />

        <HomeworkCard />

        {desktop && coachPick(false)}
        {otherOptions}

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
