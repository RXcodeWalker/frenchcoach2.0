import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { track } from '../services/telemetry/telemetryService';
import { getCoachBriefWithInput } from '../services/coach/coachBriefInput';
import { buildWeekPlan } from '../services/coach/weekPlan';
import { getLastWeeklyReview } from '../services/coach/weeklyReviewService';
import { hasMicroDrillForSkill } from '../services/coach/recurringGrammar';
import { examPracticeUnlocked } from '../features/junior/examUnlock';
import { buildMyPlan } from '../features/myPlan/planModel';
import { TOPICS } from '../data/topics';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { NextStepCard } from './progress/NextStepCard';
import { WeeklyReviewCard } from './progress/WeeklyReviewCard';
import { PlanCountdown } from './plan/PlanCountdown';
import { PlanWeekList } from './plan/PlanWeekList';
import { PlanRoad } from './plan/PlanRoad';
import { PlanStanding } from './plan/PlanStanding';
import { PlanWorked } from './plan/PlanWorked';
import { PlanCalendar } from './plan/PlanCalendar';

const topicLabel = (key: string): string => TOPICS.find(t => t.key === key)?.labelEn ?? key;

/**
 * My Plan (Design System v2): one honest path from today to the exam. It is a
 * reader, never a second coach — today is Home's mission (coachBrain), the week
 * is Home's strip (weekPlan), the road is the coach's own exam phases, the
 * standing is the learner model (counted Exam Sims only), "when you followed the
 * plan" is the coach outcome log and last week is the stored weekly review.
 * The only primary button is today's move. Nothing here predicts a grade.
 */
export function MyPlan() {
  const { state } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    track({ name: 'plan_viewed', props: {} });
  }, []);

  // Today's marked answers decide whether the coach can lead with Learn (same read as Home and Progress).
  const [answersLeft, setAnswersLeft] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void import('../services/api/apiClient')
      .then(m => m.getLearnAllowance())
      .then(a => { if (live && a) setAnswersLeft(a.remaining); }, () => {});
    return () => { live = false; };
  }, []);

  const examUnlocked = examPracticeUnlocked(state.learnerTrack, state.junior?.missionsDone);
  const plan = useMemo(() => {
    const coach = getCoachBriefWithInput({ learnAnswersLeft: answersLeft, learnerModel: state.learnerModel, examUnlocked });
    if (!coach) return null;
    const week = buildWeekPlan(coach.input, coach.brief);
    return buildMyPlan({
      input: coach.input,
      brief: coach.brief,
      week,
      model: state.learnerModel,
      hasDrill: hasMicroDrillForSkill,
      topicLabel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentSessions.length marks "a session landed"
  }, [answersLeft, state.learnerModel, examUnlocked, state.recentSessions.length]);
  const review = useMemo(() => getLastWeeklyReview(), []);

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="My Plan" subtitle="Your path to the exam" />
      <PageShell maxWidth="md">
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <h1 className="text-[clamp(30px,5cqw,40px)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">My plan</h1>
          <p className="text-body-l text-ink-muted [text-wrap:pretty]">
            From today to your exam: what to do now, this week, and at each stage — built from your own answers and Exam Sims.
          </p>
        </motion.div>

        {plan === null ? (
          <motion.p variants={fadeUp} className="rounded-card border border-hairline bg-surface p-5 text-body-s text-ink-muted" data-testid="plan-unavailable">
            Your plan couldn’t be put together on this device right now. Home still has today’s practice.
          </motion.p>
        ) : (
          <>
            <PlanCountdown countdown={plan.countdown} road={plan.road} />
            <NextStepCard move={plan.today} />
            <PlanWeekList plan={plan.week} onOpen={to => navigate(to)} />
            {plan.road && <PlanRoad road={plan.road} />}
            <PlanStanding exam={plan.exam} skills={plan.skills} hasHistory={plan.hasHistory} />
            <PlanWorked items={plan.worked} />
            <WeeklyReviewCard review={review} />
            <PlanCalendar calendar={plan.calendar} streakDays={state.profile.streak_days} />
          </>
        )}

        <motion.section variants={fadeUp} aria-labelledby="plan-how" className="flex flex-col gap-1.5 px-1" data-testid="plan-how">
          <h2 id="plan-how" className="text-eyebrow uppercase text-ink-subtle">How this plan is made</h2>
          <p className="text-[13px] text-ink-subtle [text-wrap:pretty]">
            It reads your Learn answers, your counted Exam Sims (Coached and other practice exams never count) and what
            happened when you followed earlier advice. It never predicts a grade: Cambridge sets grade boundaries for each
            exam series, and this app doesn’t have them. A trend is only shown once there are at least 3 results on each side
            to compare.
          </p>
        </motion.section>
      </PageShell>
    </div>
  );
}
