import { useState } from 'react';
import { TrendingUp, Award, Target, Calendar, Zap, BookOpen, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import { getLevelInfo, LEVELS } from '../data/gameData';

const MOCK_DAILY_DATA = [
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
  { label: 'Avoir vs Être', mastery: 65, category: 'Grammar' },
  { label: 'Gender Agreement', mastery: 55, category: 'Grammar' },
  { label: 'Negation Structures', mastery: 82, category: 'Grammar' },
  { label: 'Advanced Vocabulary', mastery: 67, category: 'Vocabulary' },
  { label: 'Academic Phrases', mastery: 45, category: 'Vocabulary' },
  { label: 'Connectors & Flow', mastery: 71, category: 'Fluency' },
  { label: 'Tense Variety', mastery: 59, category: 'Fluency' },
];

export function Progress() {
  const { state } = useApp();
  const { profile } = state;
  const { current, next, progress } = getLevelInfo(profile.total_xp);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'history'>('overview');

  const maxScore = Math.max(...MOCK_DAILY_DATA.map(d => d.score));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Progress</h2>
          <p className="text-slate-400 mt-1">Track your improvement over time</p>
        </div>
        <div className="flex gap-2">
          {(['overview', 'skills', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox icon={<Zap size={18} />} value={profile.total_xp.toLocaleString()} label="Total XP" color="blue" />
            <StatBox icon={<span className="text-lg">🔥</span>} value={profile.streak_days} label="Current Streak" color="orange" />
            <StatBox icon={<BookOpen size={18} />} value={profile.sessions_count} label="Sessions Done" color="emerald" />
            <StatBox icon={<Star size={18} />} value="7.8" label="Avg Score" color="amber" />
          </div>

          {/* Level Progress */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                Level Progress
              </h3>
              <span className="text-sm font-bold text-amber-400">{current.icon} {current.level}</span>
            </div>
            <div className="flex items-center gap-6">
              <ProgressRing
                value={progress}
                size={100}
                strokeWidth={10}
                color="#f59e0b"
                label={`${Math.round(progress)}%`}
                sublabel="to next"
              />
              <div className="flex-1">
                {LEVELS.map((lvl, i) => {
                  const isCurrent = lvl.level === current.level;
                  const isPast = profile.total_xp >= lvl.minXP && !isCurrent;
                  const isFuture = profile.total_xp < lvl.minXP;
                  return (
                    <div key={lvl.level} className="flex items-center gap-3 mb-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all ${
                          isPast ? 'bg-emerald-500 border-emerald-500' :
                          isCurrent ? 'bg-blue-500 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                          'bg-slate-800 border-slate-700'
                        }`}
                      >
                        {isPast ? '✓' : isCurrent ? '★' : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className={`text-sm font-semibold ${isCurrent ? 'text-white' : isFuture ? 'text-slate-600' : 'text-slate-400'}`}>
                            {lvl.icon} {lvl.level}
                          </span>
                          <span className="text-xs text-slate-500">{lvl.minXP.toLocaleString()} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7-Day Score Chart */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-400" />
                7-Day Performance
              </h3>
              <span className="text-xs text-slate-500">Avg: {(MOCK_DAILY_DATA.reduce((s, d) => s + d.score, 0) / MOCK_DAILY_DATA.length).toFixed(1)}/10</span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {MOCK_DAILY_DATA.map((day, i) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex items-end justify-center h-28">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 relative group cursor-pointer"
                      style={{
                        height: `${(day.score / 10) * 100}%`,
                        background: `linear-gradient(to top, rgba(59,130,246,0.8), rgba(6,182,212,0.6))`,
                        boxShadow: '0 0 8px rgba(59,130,246,0.3)',
                        animationDelay: `${i * 100}ms`,
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap">
                        {day.score} · {day.sessions} sessions
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Overview Rings */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-5 flex items-center gap-2">
              <Target size={18} className="text-emerald-400" />
              Core Skills
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
              {[
                { label: 'Grammar', value: 72, color: '#0ea5e9' },
                { label: 'Vocabulary', value: 65, color: '#f59e0b' },
                { label: 'Fluency', value: 81, color: '#10b981' },
                { label: 'Communication', value: 58, color: '#ec4899' },
              ].map(skill => (
                <div key={skill.label} className="flex flex-col items-center gap-2">
                  <ProgressRing
                    value={skill.value}
                    size={80}
                    strokeWidth={8}
                    color={skill.color}
                    label={`${skill.value}%`}
                  />
                  <span className="text-xs text-slate-400 font-medium">{skill.label}</span>
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
              <div key={category} className="glass-card p-6 rounded-2xl">
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">{category}</h3>
                <div className="space-y-4">
                  {categorySkills.map(skill => (
                    <div key={skill.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm text-slate-300">{skill.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{skill.mastery}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            skill.mastery >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                            skill.mastery >= 50 ? 'bg-amber-500/15 text-amber-400' :
                            'bg-red-500/15 text-red-400'
                          }`}>
                            {skill.mastery >= 70 ? 'Strong' : skill.mastery >= 50 ? 'Improving' : 'Focus Here'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${skill.mastery}%`,
                            background: skill.mastery >= 70 ? '#10b981' : skill.mastery >= 50 ? '#f59e0b' : '#ef4444',
                            boxShadow: `0 0 6px ${skill.mastery >= 70 ? '#10b98150' : skill.mastery >= 50 ? '#f59e0b50' : '#ef444450'}`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold text-white mb-5 flex items-center gap-2">
            <Calendar size={18} className="text-blue-400" />
            Session History
          </h3>
          <div className="space-y-3">
            {state.recentSessions.map(session => (
              <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-white/5 hover:border-white/10 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  session.mode === 'practice' ? 'bg-blue-500/15' :
                  session.mode === 'exam' ? 'bg-amber-500/15' :
                  'bg-emerald-500/15'
                }`}>
                  {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white capitalize">{session.mode}</p>
                    {session.topicKey && (
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{session.topicKey}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{session.wordCount} words • {Math.floor(session.durationSec / 60)}m {session.durationSec % 60}s</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{session.score.toFixed(1)}<span className="text-xs text-slate-500">/10</span></p>
                  <p className="text-xs text-emerald-400">+{session.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/10 border-blue-500/20 text-blue-400',
    orange: 'from-orange-500/10 border-orange-500/20 text-orange-400',
    emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`glass-card bg-gradient-to-br ${colors[color].split(' ')[0]} border ${colors[color].split(' ')[1]} p-5 rounded-2xl`}>
      <div className={`mb-2 ${colors[color].split(' ')[2]}`}>{icon}</div>
      <p className={`text-2xl font-black ${colors[color].split(' ')[2]}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
