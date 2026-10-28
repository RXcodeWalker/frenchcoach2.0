import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { resolveFeatureStatus } from '../config/featureFlags';
import { localDay } from '../domain/pronunciation/lab/days';
import { checkTrend, isCheckDue, latestCheck } from '../domain/pronunciation/lab/monthlyCheck';
import { getLabHistory } from '../services/pronunciation/labStore';
import { soundProgress } from '../domain/pronunciation/lab/soundProgress';
import { getSessionHistory } from '../services/analytics/analyticsService';
import { track } from '../services/telemetry/telemetryService';
import { getDueReviewCounts } from '../services/coach/reviewPool';
import { TOPICS } from '../data/gameData';
import { isTopicVisible } from '../features/learn/sessionSetup';
import { examSummary, learnAverage, learnSummary, nextStep, pastAttempts, practiceDays } from '../features/progress/progressSummary';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { NextStepCard } from './progress/NextStepCard';
import { AtAGlance } from './progress/AtAGlance';
import { ExamProgress } from './progress/ExamProgress';
import { ConsistencyCard } from './progress/ConsistencyCard';
import { TopicsCard } from './progress/TopicsCard';
import { PastAttempts } from './progress/PastAttempts';
import { SoundsCard } from './progress/SoundsCard';

/**
 * Progress (Design System v2, frame 3a): the next step first (the screen's
 * only primary), four numbers at a glance, the exam trend beside consistency,
 * topics weakest first, then a filterable history. Everything is derived from
 * `progressSummary`; the only local state is in Past attempts.
 */
export function Progress() {
  const { state } = useApp();
  useEffect(() => {
    track({ name: 'progress_viewed', props: {} });
  }, []);
  const { topicMastery, skillProfile, profile } = state;

  const sessions = useMemo(() => getSessionHistory(), []);
  const exam = examSummary(sessions);
  const learn = learnSummary({
    topics: TOPICS,
    isTopicVisible,
    topicMastery,
    dueCounts: getDueReviewCounts(),
    sessions,
    streakDays: profile.streak_days,
    skillProfile,
  });
  const step = nextStep({ sessions, exam, learn });
  const attempts = pastAttempts(sessions, TOPICS);
  const { user } = useAuth();
  // "Your French sounds" (pronunciation-lab plan §3.4) only while the Lab is live.
  const labLive = resolveFeatureStatus('pronunciationLab') === 'live';
  const sounds = useMemo(() => {
    if (!labLive) return null;
    const history = getLabHistory();
    const today = localDay(new Date());
    return {
      progress: soundProgress(history.observations),
      latest: latestCheck(history.checks),
      trend: checkTrend(history.checks),
      checkDue: isCheckDue(history.checks, today),
      today,
    };
  }, [labLive]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Progress" subtitle="Exam marks, practice and what’s next" />
      <PageShell>
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <h1 className="text-[clamp(30px,5cqw,40px)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">Progress</h1>
          <p className="text-body-l text-ink-muted [text-wrap:pretty]">Your exam marks, your Learn practice and what to do next.</p>
        </motion.div>

        <NextStepCard step={step} />
        <AtAGlance exam={exam} learn={learn} learnAvg={learnAverage(sessions)} />
        <div className="flex flex-wrap items-stretch gap-4">
          <ExamProgress exam={exam} />
          <ConsistencyCard days={practiceDays(sessions)} streakDays={learn.streakDays} weakSkills={learn.weakSkills} />
        </div>
        <TopicsCard learn={learn} topics={TOPICS} />
        {sounds && <SoundsCard {...sounds} signedIn={Boolean(user)} />}
        <PastAttempts attempts={attempts} />
      </PageShell>
    </div>
  );
}
