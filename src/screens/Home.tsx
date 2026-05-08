import { useState, useEffect } from 'react';
import { ChevronRight, Zap, Flame, Target, Brain, Sparkles, Clock, TrendingUp, Trophy, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import type { Screen } from '../types';

const DAILY_GOAL = 3;

export function Home() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const [animateIn, setAnimateIn] = useState(false);
  const [todayCount] = useState(2);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => { setAnimateIn(true); }, []);

  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });
  const goalComplete = todayCount >= DAILY_GOAL;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Header */}
        <div className={`flex items-center justify-between transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div>
            <p className="text-sm text-slate-500 font-medium">Good evening</p>
            <h1 className="text-2xl md:text-3xl font-black text-white">{profile.username}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-bold text-orange-400">{profile.streak_days}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Zap size={16} className="text-blue-400" />
              <span className="text-sm font-bold text-blue-400">{profile.total_xp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Hero: Today's Mission */}
        <div className={`transition-all duration-700 delay-100 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-900/90 to-slate-950 p-6 md:p-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Progress Ring */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                </div>
                <ProgressRing
                  value={todayCount}
                  max={DAILY_GOAL}
                  size={140}
                  strokeWidth={12}
                  color="#0ea5e9"
                  label={`${todayCount}/${DAILY_GOAL}`}
                  sublabel="today"
                  glow
                />
              </div>

              {/* Mission Content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-3">
                  <Target size={12} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Today's Mission</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                  {goalComplete ? 'Mission Complete' : `${DAILY_GOAL - todayCount} sessions to go`}
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  {goalComplete
                    ? 'You crushed it! Bonus XP earned.'
                    : 'Complete your daily goal to earn +50 bonus XP and keep your streak alive.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => navigate('learn')}
                    className="btn-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 group"
                  >
                    <Zap size={16} className="group-hover:scale-110 transition-transform" />
                    Start Learning
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('exam')}
                    className="px-6 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Clock size={14} />
                    Quick Exam
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className={`transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/5 via-slate-900/80 to-slate-950 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Brain size={18} className="text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI Suggests</span>
                  <Sparkles size={12} className="text-cyan-400" />
                </div>
                <p className="text-white font-semibold text-sm">Focus on <span className="text-cyan-300">Environment</span> vocabulary</p>
                <p className="text-xs text-slate-500 mt-0.5">Your weakest topic — 3 sessions will boost your score by ~15%</p>
              </div>
              <button
                onClick={() => navigate('learn')}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all"
              >
                Go
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <StatCard
            icon={<Flame size={18} className="text-orange-400" />}
            value={profile.streak_days}
            label="Day Streak"
            accent="orange"
            hovered={hoveredCard === 'streak'}
            onHover={() => setHoveredCard('streak')}
            onLeave={() => setHoveredCard(null)}
          />
          <StatCard
            icon={<Zap size={18} className="text-blue-400" />}
            value={profile.total_xp.toLocaleString()}
            label="Total XP"
            accent="blue"
            hovered={hoveredCard === 'xp'}
            onHover={() => setHoveredCard('xp')}
            onLeave={() => setHoveredCard(null)}
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-emerald-400" />}
            value="7.8"
            label="Avg Score"
            accent="emerald"
            hovered={hoveredCard === 'score'}
            onHover={() => setHoveredCard('score')}
            onLeave={() => setHoveredCard(null)}
          />
          <StatCard
            icon={<Trophy size={18} className="text-amber-400" />}
            value={state.achievements.filter(a => a.unlocked).length}
            label="Achievements"
            accent="amber"
            hovered={hoveredCard === 'ach'}
            onHover={() => setHoveredCard('ach')}
            onLeave={() => setHoveredCard(null)}
          />
        </div>

        {/* Continue Learning + Daily Challenge */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-700 delay-[350ms] ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Continue Learning */}
          <button
            onClick={() => navigate('learn')}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5 text-left hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Star size={14} className="text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Continue</span>
              </div>
              <p className="text-white font-bold mb-1">School & Education</p>
              <p className="text-xs text-slate-500">Last: Score 7.8 — 2 questions left</p>
              <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
              </div>
            </div>
          </button>

          {/* Daily Challenge */}
          <button
            onClick={() => navigate('learn')}
            className="group relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-slate-900/60 p-5 text-left hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Target size={14} className="text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Daily Challenge</span>
              </div>
              <p className="text-white font-bold mb-1">Describe your routine</p>
              <p className="text-xs text-slate-500">+35 XP bonus — 4h remaining</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-400">1/3</span>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Access Grid */}
        <div className={`transition-all duration-700 delay-[400ms] ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Access</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { icon: '📚', label: 'Practice', screen: 'learn' as Screen, color: 'blue' },
              { icon: '🎓', label: 'Exam', screen: 'exam' as Screen, color: 'amber' },
              { icon: '🧭', label: 'Explore', screen: 'explore' as Screen, color: 'cyan' },
              { icon: '📊', label: 'Progress', screen: 'progress' as Screen, color: 'emerald' },
              { icon: '💬', label: 'AI Chat', screen: 'learn' as Screen, color: 'teal' },
              { icon: '🏆', label: 'Rankings', screen: 'explore' as Screen, color: 'orange' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.screen)}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[0.04] bg-slate-900/40 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-200 hover:scale-[1.03]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`transition-all duration-700 delay-[450ms] ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {state.recentSessions.slice(0, 3).map(session => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-slate-900/40 hover:bg-slate-800/40 transition-all duration-200 group cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                  session.mode === 'practice' ? 'bg-blue-500/10 border border-blue-500/20' :
                  session.mode === 'exam' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-emerald-500/10 border border-emerald-500/20'
                }`}>
                  {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white capitalize">{session.mode}</p>
                  <p className="text-xs text-slate-500 truncate">{session.topicKey ?? 'General'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{session.score.toFixed(1)}<span className="text-[10px] text-slate-500">/10</span></p>
                  <p className="text-[10px] text-emerald-400 font-semibold">+{session.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
  hovered,
  onHover,
  onLeave,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const borders: Record<string, string> = {
    orange: 'border-orange-500/20 hover:border-orange-500/40',
    blue: 'border-blue-500/20 hover:border-blue-500/40',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    amber: 'border-amber-500/20 hover:border-amber-500/40',
  };

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`rounded-2xl border ${borders[accent]} bg-slate-900/60 p-4 transition-all duration-300 cursor-pointer ${hovered ? 'scale-[1.02] shadow-lg' : ''}`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
    </div>
  );
}
