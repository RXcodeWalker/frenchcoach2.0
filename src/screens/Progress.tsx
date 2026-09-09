import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getSessionHistory } from '../services/analytics/analyticsService';
import { getLastWeeklyReview, markWeeklyReviewSeen } from '../services/coach/weeklyReviewService';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { Tabs } from '../components/ui/Tabs';
import { OverviewTab } from './progress/OverviewTab';
import { SkillsTab } from './progress/SkillsTab';
import { SkillTreeTab } from './progress/SkillTreeTab';
import { InsightsTab } from './progress/InsightsTab';
import { HistoryTab } from './progress/HistoryTab';
import { PerformanceTimeline } from './progress/PerformanceTimeline';
import { WeeklyReviewCard } from './progress/WeeklyReviewCard';
import type { Session } from '../types';
import type { WeeklyReview } from '../types/coach';

// The primary three tabs the design system specs (SCREENS §6). The other four
// panels stay reachable by URL / the features grid — they render with a "back"
// affordance instead of a fifth-plus chip in the primary bar.
const PRIMARY = ['overview', 'skills', 'history'] as const;
const SECONDARY = ['timeline', 'tree', 'insights', 'review'] as const;
type Tab = (typeof PRIMARY)[number] | (typeof SECONDARY)[number];
const ALL: Tab[] = [...PRIMARY, ...SECONDARY];

function storedToSession(s: ReturnType<typeof getSessionHistory>[number]): Session {
  return {
    id: s.id,
    mode: s.mode as Session['mode'],
    topicKey: s.topicKey ?? undefined,
    questionText: s.questionText,
    transcript: s.transcript,
    wordCount: s.wordCount,
    score: s.score,
    xpEarned: 0,
    durationSec: s.durationSec,
    createdAt: s.date,
  };
}

const SECONDARY_LABEL: Record<(typeof SECONDARY)[number], string> = {
  timeline: 'Performance timeline',
  tree: 'Skill tree',
  insights: 'Insights',
  review: 'Weekly review',
};

export function Progress() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as Tab | null;

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab && ALL.includes(initialTab) ? initialTab : 'overview',
  );

  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);

  useEffect(() => {
    setWeeklyReview(getLastWeeklyReview());
  }, []);

  useEffect(() => {
    if (activeTab === 'review') {
      markWeeklyReviewSeen();
    }
  }, [activeTab]);

  const allSessions: Session[] = getSessionHistory().map(storedToSession);
  const inSecondary = (SECONDARY as readonly string[]).includes(activeTab);

  return (
    <PageShell>
      <motion.div variants={fadeUp}>
        <h1 className="text-title text-ink">Progress</h1>
        <p className="text-body-s text-ink-subtle mt-1">Track your improvement</p>
      </motion.div>

      {inSecondary ? (
        <motion.button
          variants={fadeUp}
          type="button"
          onClick={() => setActiveTab('overview')}
          className="text-label text-ink-subtle hover:text-ink transition-colors duration-state ease-smooth"
        >
          ‹ Back to overview · {SECONDARY_LABEL[activeTab as (typeof SECONDARY)[number]]}
        </motion.button>
      ) : (
        <motion.div variants={fadeUp}>
          <Tabs
            tabs={PRIMARY.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }))}
            value={activeTab}
            onChange={(id) => setActiveTab(id as Tab)}
          />
        </motion.div>
      )}

      {activeTab === 'overview' && <OverviewTab profile={state.profile} />}
      {activeTab === 'skills' && <SkillsTab />}
      {activeTab === 'history' && <HistoryTab sessions={allSessions} />}
      {activeTab === 'timeline' && <PerformanceTimeline sessions={allSessions} />}
      {activeTab === 'tree' && <SkillTreeTab />}
      {activeTab === 'insights' && <InsightsTab />}
      {activeTab === 'review' && <WeeklyReviewCard review={weeklyReview} variant="full" />}
    </PageShell>
  );
}
