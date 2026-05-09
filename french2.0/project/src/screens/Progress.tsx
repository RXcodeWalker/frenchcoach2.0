import { useState } from 'react';
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
  { id: 'basics', label: 'Basics', icon: '🌱', unlocked: true, mastery: 100, children: ['greetings', 'numbers'] },
  { id: 'greetings', label: 'Greetings', icon: '👋', unlocked: true, mastery: 90, children: [] },
  { id: 'numbers', label: 'Numbers', icon: '🔢', unlocked: true, mastery: 75, children: [] },
  { id: 'daily', label: 'Daily Life', icon: '🏠', unlocked: true, mastery: 60, children: ['school', 'food'] },
  { id: 'school', label: 'School', icon: '🎓', unlocked: true, mastery: 72, children: [] },
  { id: 'food', label: 'Food', icon: '🥐', unlocked: true, mastery: 55, children: [] },
  { id: 'society', label: 'Society', icon: '🌍', unlocked: true, mastery: 40, children: ['environment', 'tech'] },
  { id: 'environment', label: 'Environment', icon: '🌿', unlocked: false, mastery: 0, children: [] },
  { id: 'tech', label: 'Technology', icon: '💻', unlocked: false, mastery: 0, children: [] },
  { id: 'mastery', label: 'Mastery', icon: '👑', unlocked: false, mastery: 0, children: [] },
];

export function Progress() {
  const { state } = useApp();
  const { profile } = state;
  const { current, progress } = getLevelInfo(profile.total_xp);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'tree' | 'history'>('overview');

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Progress</h1>
            <p className="text-sm text-slate-500 mt-1">Track your improvement</p>
          </div>
          <div className="flex gap-1.5">
            {(['overview', 'skills', 'tree', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all duration-200 ${activeTab === tab ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' : 'text-slate-500 hover:text-white border border-transparent'}`}>{tab}</button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat icon={<Zap size={16} className="text-blue-400" />} value={profile.total_xp.toLocaleString()} label="Total XP" />
              <MiniStat icon={<span className="text-base">🔥</span>} value={profile.streak_days} label="Day Streak" />
              <MiniStat icon={<span className="text-base">📚</span>} value={profile.sessions_count} label="Sessions" />
              <MiniStat icon={<span className="text-base">💬</span>} value={profile.total_words_spoken.toLocaleString()} label="Words" />
            </div>

            {/* Level */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-amber-400" />
                <h3 className="font-bold text-white text-sm">Level Progress</h3>
                <span className="ml-auto text-xs font-bold text-amber-400">{current.icon} {current.level}</span>
              </div>
              <div className="flex items-center gap-6">
                <ProgressRing value={progress} size={90} strokeWidth={8} color="#f59e0b" label={`${Math.round(progress)}%`} sublabel="to next" />
                <div className="flex-1 space-y-2">
                  {LEVELS.map(lvl => {
                    const isCurrent = lvl.level === current.level;
                    const isPast = profile.total_xp >= lvl.minXP && !isCurrent;
                    return (
                      <div key={lvl.level} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${isPast ? 'bg-emerald-500 border-emerald-500' : isCurrent ? 'bg-blue-500 border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]' : 'bg-slate-800 border-slate-700'}`}>
                          {isPast ? '✓' : isCurrent ? '★' : ''}
                        </div>
                        <span className={`text-xs ${isCurrent ? 'text-white font-bold' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>{lvl.icon} {lvl.level}</span>
                        <span className="text-[10px] text-slate-600 ml-auto">{lvl.minXP.toLocaleString()} XP</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 7-Day Chart */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2"><TrendingUp size={16} className="text-blue-400" /><h3 className="font-bold text-white text-sm">7-Day Performance</h3></div>
                <span className="text-[10px] text-slate-500">Avg: {(MOCK_DAILY.reduce((s, d) => s + d.score, 0) / MOCK_DAILY.length).toFixed(1)}</span>
              </div>
              <div className="flex items-end gap-2 h-32">
                {MOCK_DAILY.map((day, idx) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="relative w-full flex items-end justify-center h-24">
                      <div className="w-full rounded-t-md transition-all duration-500 relative group cursor-pointer" style={{ height: `${(day.score / 10) * 100}%`, background: 'linear-gradient(to top, rgba(59,130,246,0.7), rgba(6,182,212,0.5))', boxShadow: '0 0 6px rgba(59,130,246,0.2)', animationDelay: `${idx * 80}ms` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap">{day.score}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Skills */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
              <div className="flex items-center gap-2 mb-5"><Target size={16} className="text-emerald-400" /><h3 className="font-bold text-white text-sm">Core Skills</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                {[{ label: 'Grammar', value: 72, color: '#0ea5e9' }, { label: 'Vocabulary', value: 65, color: '#f59e0b' }, { label: 'Fluency', value: 81, color: '#10b981' }, { label: 'Communication', value: 58, color: '#ec4899' }].map(skill => (
                  <div key={skill.label} className="flex flex-col items-center gap-1.5">
                    <ProgressRing value={skill.value} size={70} strokeWidth={7} color={skill.color} label={`${skill.value}%`} />
                    <span className="text-[10px] text-slate-500 font-medium">{skill.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            {['Grammar', 'Vocabulary', 'Fluency'].map(category => {
              const categorySkills = SKILLS.filter(s => s.category === category);
              return (
                <div key={category} className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4">{category}</h3>
                  <div className="space-y-3">
                    {categorySkills.map(skill => (
                      <div key={skill.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-300">{skill.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{skill.mastery}%</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${skill.mastery >= 70 ? 'bg-emerald-500/15 text-emerald-400' : skill.mastery >= 50 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                              {skill.mastery >= 70 ? 'Strong' : skill.mastery >= 50 ? 'Improving' : 'Focus'}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${skill.mastery}%`, background: skill.mastery >= 70 ? '#10b981' : skill.mastery >= 50 ? '#f59e0b' : '#ef4444', boxShadow: `0 0 4px ${skill.mastery >= 70 ? '#10b98150' : skill.mastery >= 50 ? '#f59e0b50' : '#ef444450'}` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'tree' && (
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
            <h3 className="font-bold text-white text-sm mb-6">Skill Tree</h3>
            <div className="space-y-3">
              {SKILL_TREE.map((node) => (
                <div key={node.id} className="flex items-center gap-3" style={{ paddingLeft: `${(node.id.split('.').length - 1) * 24}px` }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${node.unlocked ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/50 border-white/5 opacity-40'}`}>
                    {node.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${node.unlocked ? 'text-white' : 'text-slate-600'}`}>{node.label}</p>
                    {node.unlocked && node.mastery > 0 && (
                      <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden w-32">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${node.mastery}%` }} />
                      </div>
                    )}
                  </div>
                  {node.unlocked && <span className="text-xs font-bold text-blue-400">{node.mastery}%</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 mb-5"><Calendar size={16} className="text-blue-400" /><h3 className="font-bold text-white text-sm">Session History</h3></div>
            <div className="space-y-2">
              {state.recentSessions.map(session => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/[0.04] hover:border-white/10 transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${session.mode === 'practice' ? 'bg-blue-500/10 border border-blue-500/20' : session.mode === 'exam' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                    {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white capitalize">{session.mode}</p>
                    <p className="text-[10px] text-slate-600">{session.wordCount} words / {Math.floor(session.durationSec / 60)}m</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-white">{session.score.toFixed(1)}<span className="text-[10px] text-slate-500">/10</span></p>
                    <p className="text-[10px] text-emerald-400 font-semibold">+{session.xpEarned} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
    </div>
  );
}
