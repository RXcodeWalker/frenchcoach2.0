import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getSessionHistory } from '../services/analytics/analyticsService';
import { getDueReviewCounts } from '../services/coach/reviewPool';
import { TOPICS } from '../data/gameData';
import { isTopicVisible } from '../features/learn/sessionSetup';
import { examSummary, learnSummary, nextStep, pastAttempts } from '../features/progress/progressSummary';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { NextStepCard } from './progress/NextStepCard';
import { ExamProgress } from './progress/ExamProgress';
import { LearnProgress } from './progress/LearnProgress';
import { PastAttempts } from './progress/PastAttempts';

export function Progress() {
  const { state } = useApp();
  const { topicMastery, skillProfile, profile } = state;

  const sessions = getSessionHistory();
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

  return (
    <PageShell>
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black text-ink">Progress</h1>
        <p className="text-sm text-ink-muted mt-1">Your exam marks, your Learn practice and what to do next.</p>
      </motion.div>

      <NextStepCard step={step} />
      <ExamProgress exam={exam} />
      <LearnProgress learn={learn} />
      <PastAttempts attempts={attempts} />
    </PageShell>
  );
}
