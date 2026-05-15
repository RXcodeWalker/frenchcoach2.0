import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getSessionHistory } from '../services/analytics/analyticsService';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { OverviewTab } from './progress/OverviewTab';
import { SkillsTab } from './progress/SkillsTab';
import { SkillTreeTab } from './progress/SkillTreeTab';
import { InsightsTab } from './progress/InsightsTab';
import { HistoryTab } from './progress/HistoryTab';
import { PerformanceTimeline } from './progress/PerformanceTimeline';
import type { Session } from '../types';

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

export function Progress() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'overview' | 'skills' | 'timeline' | 'tree' | 'insights' | 'history' | null;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'timeline' | 'tree' | 'insights' | 'history'>(
    initialTab && ['overview', 'skills', 'timeline', 'tree', 'insights', 'history'].includes(initialTab) 
      ? initialTab 
      : 'overview'
  );

  const allSessions: Session[] = getSessionHistory().map(storedToSession);

  return (
    <PageShell>
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Progress</h1>
          <p className="text-sm text-slate-500 mt-1">Track your improvement</p>
        </div>
        <div className="flex gap-1">
          {(['overview', 'skills', 'timeline', 'tree', 'insights', 'history'] as const).map(tab => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all duration-200 ${
                activeTab === tab ? 'bg-violet-electric/10 text-violet-400 border border-violet-electric/20' : 'text-slate-600 hover:text-white border border-transparent'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {tab}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'overview' && <OverviewTab profile={state.profile} />}
      {activeTab === 'skills' && <SkillsTab />}
      {activeTab === 'timeline' && <PerformanceTimeline sessions={allSessions} />}
      {activeTab === 'tree' && <SkillTreeTab />}
      {activeTab === 'insights' && <InsightsTab />}
      {activeTab === 'history' && <HistoryTab sessions={allSessions} />}
    </PageShell>
  );
}
