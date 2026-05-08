import { useState, useEffect } from 'react';
import { Zap, Target, Trophy, BookOpen, GraduationCap, MessageSquare, ChevronRight, Star, Lock, TrendingUp, Flame, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TOPICS, ACHIEVEMENTS, getLevelInfo } from '../data/gameData';
import { ProgressRing } from '../components/ProgressRing';
import type { Screen } from '../types';

const DAILY_GOAL = 3;

export function Dashboard() {
  const { state, dispatch } = useApp();
  const { profile, recentSessions, achievements } = state;
  const { current, next, progress, progressInLevel, levelRange } = getLevelInfo(profile.total_xp);
  const [todayCount, setTodayCount] = useState(2);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const avgScore = recentSessions.length > 0
    ? recentSessions.reduce((s, r) => s + r.score, 0) / recentSessions.length
    : 0;

  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });

  return (
    <div className={`space-y-6 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-slate-800/80 to-slate-900 border border-blue-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                {current.icon} {current.level}
              </span>
              <span className="text-sm text-slate-400">Level {ACHIEVEMENTS.findIndex(a => !a.unlocked)}</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              Bonjour, {profile.username?.split(' ')[0] ?? 'Learner'}! 👋
            </h2>
            <p className="text-slate-300 mb-6">
              You're on a <span className="text-orange-400 font-bold">{profile.streak_days}-day streak</span>. Keep it up to earn bonus XP!
            </p>
            <button
              onClick={() => navigate('practice')}
              className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-[0_0_30px_rgba(59,130,246,0.35)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap size={20} className="group-hover:animate-pulse" />
              Continue Learning
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon="🔥" value={profile.streak_days} label="Day Streak" color="orange" />
            <StatCard icon="⚡" value={profile.total_xp.toLocaleString()} label="Total XP" color="blue" />
            <StatCard icon="📚" value={profile.sessions_count} label="Sessions" color="green" />
            <StatCard icon="💬" value={profile.total_words_spoken.toLocaleString()} label="Words Spoken" color="cyan" />
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="relative mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300">{current.level}</span>
            <span className="text-sm font-bold text-blue-400">{progressInLevel.toLocaleString()} / {levelRange.toLocaleString()} XP</span>
            {next && <span className="text-sm font-semibold text-slate-300">{next.level}</span>}
          </div>
          <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Goal + Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Goal */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-blue-400" />
            <h3 className="font-bold text-white text-sm">Daily Goal</h3>
          </div>
          <div className="flex items-center justify-center mb-4">
            <ProgressRing
              value={todayCount}
              max={DAILY_GOAL}
              size={100}
              strokeWidth={10}
              color="#0ea5e9"
              label={`${todayCount}/${DAILY_GOAL}`}
              sublabel="sessions"
            />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: DAILY_GOAL }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-all duration-500 ${i < todayCount ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' : 'bg-slate-700'}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            {todayCount >= DAILY_GOAL ? '🎉 Goal complete!' : `${DAILY_GOAL - todayCount} more to reach daily goal`}
          </p>
        </div>

        {/* Skill Overview */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Skill Overview</h3>
            </div>
            <button onClick={() => navigate('progress')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View Details <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Grammar', value: 72, color: '#0ea5e9' },
              { label: 'Vocabulary', value: 65, color: '#f59e0b' },
              { label: 'Fluency', value: 81, color: '#10b981' },
              { label: 'Communication', value: 58, color: '#ec4899' },
            ].map(skill => (
              <div key={skill.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">{skill.label}</span>
                  <span className="text-xs font-bold" style={{ color: skill.color }}>{skill.value}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${skill.value}%`, background: skill.color, boxShadow: `0 0 6px ${skill.color}50` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Practice Topics */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-400" />
            <h3 className="font-bold text-white">Practice Topics</h3>
          </div>
          <span className="text-xs text-slate-400">{TOPICS.length} topics available</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TOPICS.map(topic => (
            <button
              key={topic.key}
              onClick={() => navigate('practice')}
              className="group relative p-4 rounded-xl border border-white/5 bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-200 hover:scale-[1.02] hover:border-white/10 text-left overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: `radial-gradient(circle at top left, ${topic.color}15, transparent 70%)` }}
              />
              <span className="text-2xl block mb-2">{topic.icon}</span>
              <p className="font-semibold text-white text-xs leading-tight">{topic.label}</p>
              <p className="text-slate-500 text-xs mt-1">{topic.questionsCount} questions</p>
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(to right, transparent, ${topic.color}, transparent)` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Achievements + Recent Sessions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Achievements */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <h3 className="font-bold text-white">Achievements</h3>
            </div>
            <span className="text-xs text-slate-400">{unlockedCount}/{achievements.length} unlocked</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {achievements.slice(0, 8).map(achievement => (
              <div
                key={achievement.id}
                className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                  achievement.unlocked
                    ? 'cursor-pointer hover:scale-110'
                    : 'opacity-40 grayscale cursor-not-allowed'
                }`}
                title={achievement.name}
              >
                <span className="text-2xl">{achievement.unlocked ? achievement.icon : <Lock size={18} className="text-slate-500" />}</span>
                <span className={`text-[10px] font-medium text-center leading-tight ${achievement.unlocked ? 'text-slate-300' : 'text-slate-600'}`}>
                  {achievement.name.split(' ')[0]}
                </span>
                {achievement.unlocked && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-blue-400" />
              <h3 className="font-bold text-white">Recent Sessions</h3>
            </div>
          </div>
          <div className="space-y-3">
            {recentSessions.slice(0, 4).map(session => (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:border-white/10 transition-all duration-200">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  session.mode === 'practice' ? 'bg-blue-500/15' :
                  session.mode === 'exam' ? 'bg-amber-500/15' :
                  session.mode === 'roleplay' ? 'bg-emerald-500/15' : 'bg-purple-500/15'
                }`}>
                  {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : session.mode === 'roleplay' ? '💬' : '⭐'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white capitalize">{session.mode}</p>
                  <p className="text-xs text-slate-500 truncate">{session.topicKey ?? 'General'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{session.score.toFixed(1)}<span className="text-xs text-slate-500">/10</span></p>
                  <p className="text-xs text-emerald-400">+{session.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon={<BookOpen size={24} />}
          title="Practice Speaking"
          description="450+ IGCSE questions with AI feedback"
          color="blue"
          onClick={() => navigate('practice')}
        />
        <QuickActionCard
          icon={<GraduationCap size={24} />}
          title="Exam Mode"
          description="Full IGCSE exam simulation with timer"
          color="amber"
          onClick={() => navigate('exam')}
          badge="IGCSE"
        />
        <QuickActionCard
          icon={<MessageSquare size={24} />}
          title="Roleplay"
          description="31 real-world French scenarios"
          color="emerald"
          onClick={() => navigate('roleplay')}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500/10 to-transparent border-orange-500/20 text-orange-400',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 w-32`}>
      <span className="text-2xl">{icon}</span>
      <p className={`text-xl font-black mt-1 ${colors[color].split(' ')[3]}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, color, onClick, badge }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'amber' | 'emerald';
  onClick: () => void;
  badge?: string;
}) {
  const colors = {
    blue: 'from-blue-600/15 to-blue-800/5 border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    amber: 'from-amber-600/15 to-amber-800/5 border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    emerald: 'from-emerald-600/15 to-emerald-800/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  };
  return (
    <button
      onClick={onClick}
      className={`group relative p-5 rounded-2xl bg-gradient-to-br border ${colors[color]} transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${colors[color].split(' ')[5]} p-2 rounded-xl bg-current/10`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
            {badge}
          </span>
        )}
      </div>
      <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      <ChevronRight size={16} className={`absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1 ${colors[color].split(' ')[5]}`} />
    </button>
  );
}
