import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Trophy, Calendar, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import { getLevelInfo, LEVELS } from '../data/gameData';

const MOCK_DAILY = [
  { day: 'Mon', score: 6.2, sessions: 2 },
  { day: 'Tue', score: 7.1, sessions: 3 },
  { day: 'Wed', score: 6.8, sessions: 1 },
  { day: 'Thu', score: 7.9, sessions: 4 },
  { day: 'Fri', score: 8.1, sessions: 2 },
  { day: 'Sat', score: 7.4, sessions: 3 },
  { day: 'Sun', score: 8.5, sessions: 2 },
];

const SKILLS = [
  { label: 'Elision & Contraction', mastery: 78, category: 'Grammar' },
  { label: 'Avoir vs Etre', mastery: 65, category: 'Grammar' },
  { label: 'Gender Agreement', mastery: 55, category: 'Grammar' },
  { label: 'Negation Structures', mastery: 82, category: 'Grammar' },
  { label: 'Advanced Vocabulary', mastery: 67, category: 'Vocabulary' },
  { label: 'Academic Phrases', mastery: 45, category: 'Vocabulary' },
  { label: 'Connectors & Flow', mastery: 71, category: 'Fluency' },
  { label: 'Tense Variety', mastery: 59, category: 'Fluency' },
];

const SKILL_TREE = [
  { id: 'basics', label: 'Basics', icon: '🌱', unlocked: true, mastery: 100 },
  { id: 'greetings', label: 'Greetings', icon: '👋', unlocked: true, mastery: 90 },
  { id: 'numbers', label: 'Numbers', icon: '🔢', unlocked: true, mastery: 75 },
  { id: 'daily', label: 'Daily Life', icon: '🏠', unlocked: true, mastery: 60 },
  { id: 'school', label: 'School', icon: '🎓', unlocked: true, mastery: 72 },
  { id: 'food', label: 'Food', icon: '🥐', unlocked: true, mastery: 55 },
  { id: 'society', label: 'Society', icon: '🌍', unlocked: true, mastery: 40 },
  { id: 'environment', label: 'Environment', icon: '🌿', unlocked: false, mastery: 0 },
  { id: 'tech', label: 'Technology', icon: '💻', unlocked: false, mastery: 0 },
  { id: 'mastery', label: 'Mastery', icon: '👑', unlocked: false, mastery: 0 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export function Progress() {
  const { state } = useApp();
  const { profile } = state;
  const { current, progress } = getLevelInfo(profile.total_xp);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'tree' | 'history'>('overview');
  const maxScore = Math.max(...MOCK_DAILY.map(d => d.score));

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Progress</h1>
            <p className="text-sm text-slate-500 mt-1">Track your improvement</p>
          </div>
          <div className="flex gap-1">
            {(['overview', 'skills', 'tree', 'history'] as const).map(tab => (
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

        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { icon: <Zap size={15} className="text-violet-400" />, value: profile.total_xp.toLocaleString(), label: 'Total XP' },
                { icon: <span className="text-sm">🔥</span>, value: profile.streak_days, label: 'Day Streak' },
                { icon: <span className="text-sm">📚</span>, value: profile.sessions_count, label: 'Sessions' },
                { icon: <span className="text-sm">💬</span>, value: profile.total_words_spoken.toLocaleString(), label: 'Words' },
              ].map(s => (
                <div key={s.label} className="rounded-xl glass p-3.5">
                  <div className="mb-1.5">{s.icon}</div>
                  <p className="text-lg font-black text-white">{s.value}</p>
                  <p className="text-[9px] text-slate-600 font-medium">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Level */}
            <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={14} className="text-amber-400" />
                <h3 className="font-bold text-white text-sm">Level Progress</h3>
                <span className="ml-auto text-[10px] font-bold text-amber-400">{current.icon} {current.level}</span>
              </div>
              <div className="flex items-center gap-6">
                <ProgressRing value={progress} size={85} strokeWidth={7} color="#F59E0B" label={`${Math.round(progress)}%`} sublabel="to next" />
                <div className="flex-1 space-y-1.5">
                  {LEVELS.map(lvl => {
                    const isCurrent = lvl.level === current.level;
                    const isPast = profile.total_xp >= lvl.minXP && !isCurrent;
                    return (
                      <div key={lvl.level} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border ${
                          isPast ? 'bg-emerald-500 border-emerald-500' : isCurrent ? 'bg-violet-electric border-violet-electric shadow-[0_0_6px_rgba(124,58,237,0.5)]' : 'bg-navy-300 border-navy-400'
                        }`}>
                          {isPast ? '✓' : isCurrent ? '★' : ''}
                        </div>
                        <span className={`text-[10px] ${isCurrent ? 'text-white font-bold' : isPast ? 'text-slate-500' : 'text-slate-700'}`}>{lvl.icon} {lvl.level}</span>
                        <span className="text-[9px] text-slate-700 ml-auto">{lvl.minXP.toLocaleString()} XP</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* 7-Day Chart with smooth curves */}
            <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><TrendingUp size={14} className="text-violet-400" /><h3 className="font-bold text-white text-sm">7-Day Performance</h3></div>
                <span className="text-[9px] text-slate-600">Avg: {(MOCK_DAILY.reduce((s, d) => s + d.score, 0) / MOCK_DAILY.length).toFixed(1)}</span>
              </div>
              <div className="relative h-28">
                <svg className="w-full h-full" viewBox="0 0 700 112" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="progLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                  </defs>
                  <path
                    d={MOCK_DAILY.map((d, i) => {
                      const x = (i / (MOCK_DAILY.length - 1)) * 700;
                      const y = 112 - (d.score / maxScore) * 100;
                      return i === 0 ? `M${x},${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
                    }).join(' ') + ` L700,112 L0,112 Z`}
                    fill="url(#progGrad)"
                  />
                  <path
                    d={MOCK_DAILY.map((d, i) => {
                      const x = (i / (MOCK_DAILY.length - 1)) * 700;
                      const y = 112 - (d.score / maxScore) * 100;
                      return i === 0 ? `M${x},${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="url(#progLine)" strokeWidth="2.5" strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(124, 58, 237, 0.4))' }}
                  />
                  {MOCK_DAILY.map((d, i) => {
                    const x = (i / (MOCK_DAILY.length - 1)) * 700;
                    const y = 112 - (d.score / maxScore) * 100;
                    return <circle key={i} cx={x} cy={y} r="3" fill="#7C3AED" style={{ filter: 'drop-shadow(0 0 3px rgba(124, 58, 237, 0.6))' }} />;
                  })}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 translate-y-5">
                  {MOCK_DAILY.map(d => <span key={d.day} className="text-[8px] text-slate-700">{d.day}</span>)}
                </div>
              </div>
            </motion.div>

            {/* Core Skills with rings */}
            <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
              <div className="flex items-center gap-2 mb-4"><Target size={14} className="text-emerald-400" /><h3 className="font-bold text-white text-sm">Core Skills</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                {[
                  { label: 'Grammar', value: 72, color: '#7C3AED' },
                  { label: 'Vocabulary', value: 65, color: '#F59E0B' },
                  { label: 'Fluency', value: 81, color: '#10B981' },
                  { label: 'Communication', value: 58, color: '#EC4899' },
                ].map(skill => (
                  <div key={skill.label} className="flex flex-col items-center gap-1.5">
                    <ProgressRing value={skill.value} size={65} strokeWidth={6} color={skill.color} label={`${skill.value}%`} />
                    <span className="text-[9px] text-slate-600 font-medium">{skill.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {activeTab === 'skills' && (
          <motion.div variants={fadeUp} className="space-y-3">
            {['Grammar', 'Vocabulary', 'Fluency'].map(category => {
              const categorySkills = SKILLS.filter(s => s.category === category);
              return (
                <div key={category} className="rounded-xl glass p-4">
                  <h3 className="font-bold text-white text-[10px] uppercase tracking-wider mb-3">{category}</h3>
                  <div className="space-y-2.5">
                    {categorySkills.map(skill => (
                      <div key={skill.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-slate-400">{skill.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white">{skill.mastery}%</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                              skill.mastery >= 70 ? 'bg-emerald-500/10 text-emerald-400' : skill.mastery >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {skill.mastery >= 70 ? 'Strong' : skill.mastery >= 50 ? 'Improving' : 'Focus'}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-navy-300 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full shimmer-bar"
                            style={{ background: skill.mastery >= 70 ? '#10B981' : skill.mastery >= 50 ? '#F59E0B' : '#EF4444' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.mastery}%` }}
                            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'tree' && (
          <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
            <h3 className="font-bold text-white text-sm mb-5">Skill Tree</h3>
            <div className="space-y-2">
              {SKILL_TREE.map((node) => (
                <motion.div
                  key={node.id}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base border transition-all ${
                    node.unlocked ? 'bg-violet-electric/8 border-violet-electric/15' : 'bg-navy-300 border-white/[0.03] opacity-35'
                  }`}>
                    {node.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${node.unlocked ? 'text-white' : 'text-slate-700'}`}>{node.label}</p>
                    {node.unlocked && node.mastery > 0 && (
                      <div className="mt-1 h-0.5 bg-navy-300 rounded-full overflow-hidden w-28">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-electric to-indigo-400" style={{ width: `${node.mastery}%` }} />
                      </div>
                    )}
                  </div>
                  {node.unlocked && <span className="text-[10px] font-bold text-violet-400">{node.mastery}%</span>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div variants={fadeUp} className="rounded-xl glass p-4">
            <div className="flex items-center gap-2 mb-4"><Calendar size={14} className="text-violet-400" /><h3 className="font-bold text-white text-sm">Session History</h3></div>
            <div className="space-y-1.5">
              {state.recentSessions.map(session => (
                <motion.div
                  key={session.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg glass-subtle hover:bg-white/[0.02] transition-all cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                    session.mode === 'practice' ? 'bg-violet-electric/8 border border-violet-electric/15' :
                    session.mode === 'exam' ? 'bg-amber-500/8 border border-amber-500/15' :
                    'bg-emerald-500/8 border border-emerald-500/15'
                  }`}>
                    {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white capitalize">{session.mode}</p>
                    <p className="text-[9px] text-slate-700">{session.wordCount} words / {Math.floor(session.durationSec / 60)}m</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-white">{session.score.toFixed(1)}<span className="text-[8px] text-slate-700">/10</span></p>
                    <p className="text-[9px] text-emerald-400 font-semibold">+{session.xpEarned} XP</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
