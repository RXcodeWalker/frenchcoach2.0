import { useState, useEffect } from 'react';
import { ChevronRight, Zap, Target, Trophy, Flame, TrendingUp, BookOpen, MessageSquare, GraduationCap, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TOPICS } from '../data/gameData';
import { ProgressRing } from '../components/ProgressRing';
import { TopContextBar } from '../components/TopContextBar';
import type { Screen } from '../types';

const DAILY_GOAL = 3;

export function DashboardNew() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const [animateIn, setAnimateIn] = useState(false);
  const [todayCount, setTodayCount] = useState(2);
  const [showStreakAlert, setShowStreakAlert] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
    // Simulate streak at risk after 6 hours
    const timer = setTimeout(() => {
      if (profile.streak_days > 0) {
        setShowStreakAlert(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [profile.streak_days]);

  const streakComplete = todayCount >= DAILY_GOAL;
  const recommendedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const unlockedAchievements = state.achievements.filter(a => a.unlocked).length;

  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });

  return (
    <div className="pb-24 md:pb-8">
      <TopContextBar title="FrenchCoach" subtitle="Your Daily Learning Journey" />

      <div className="max-w-2xl mx-auto px-4 pt-24 space-y-6">
        {/* Streak Alert */}
        {showStreakAlert && todayCount === 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🔥</span>
              <div className="flex-1">
                <p className="font-bold text-red-300">Your {profile.streak_days}-day streak ends in 8 hours!</p>
                <p className="text-sm text-red-200/80">Practice now to keep it alive</p>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY: Daily Goal Section - POWERFUL HERO */}
        <div
          className={`transition-all duration-700 ${
            animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="glass-card p-8 rounded-3xl border-2 border-blue-500/40 shadow-[0_0_60px_rgba(59,130,246,0.25)] bg-gradient-to-br from-blue-600/15 via-slate-800/80 to-slate-900 relative overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-blob" />
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none animate-blob animation-delay-2000" />

            <div className="relative z-10">
              <div className="text-center mb-6">
                <p className="text-sm text-blue-300 uppercase tracking-widest font-bold mb-2">
                  🎯 Today's Challenge
                </p>
                <h2 className="text-5xl font-black text-white mb-2 leading-tight">
                  {todayCount} of {DAILY_GOAL}
                </h2>
                <p className="text-lg text-slate-200">
                  {streakComplete
                    ? '✨ Goal crushed! Keep momentum going!'
                    : `${DAILY_GOAL - todayCount} session${DAILY_GOAL - todayCount !== 1 ? 's' : ''} for +50 XP bonus`}
                </p>
              </div>

              {/* XP Reward Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/15 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Zap size={16} className="text-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-emerald-300">+50 XP when complete</span>
                </div>
              </div>

              {/* Level Progress Indicator */}
              {profile.total_xp < 3500 && (
                <div className="text-center mb-6 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300 font-bold">
                    {Math.round(((3500 - profile.total_xp) / 3500) * 100)}% away from Advanced level
                  </p>
                </div>
              )}

              {/* Daily Goal Ring - Animated */}
              <div className="flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 blur-xl animate-pulse" />
                </div>
                <ProgressRing
                  value={todayCount}
                  max={DAILY_GOAL}
                  size={160}
                  strokeWidth={14}
                  color="#0ea5e9"
                  label={`${todayCount}/${DAILY_GOAL}`}
                  sublabel="sessions today"
                  glow
                />
              </div>

              {/* Progress indicator - More visible */}
              <div className="flex gap-3 mb-8 justify-center">
                {Array.from({ length: DAILY_GOAL }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-500 ${
                      i < todayCount
                        ? 'w-12 h-4 bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                        : 'w-8 h-4 bg-slate-700/60'
                    }`}
                  />
                ))}
              </div>

              {/* Main CTA - Powerful with pulse */}
              <button
                onClick={() => navigate('practice')}
                className="w-full btn-primary py-6 rounded-2xl font-bold text-lg mb-3 flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] hover:scale-[1.02] active:scale-95 transition-all duration-200 group relative overflow-hidden"
              >
                {/* Glow effect on button */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <Zap size={22} className="group-hover:animate-pulse group-hover:scale-110 transition-transform" />
                  <span>Start Learning Now</span>
                  <ChevronRight size={20} className="group-hover:translate-x-2 transition-all" />
                </span>
              </button>

              {/* Quick stats inline */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => navigate('exam')}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-700/10 hover:from-amber-600/30 hover:to-orange-700/20 text-amber-200 hover:text-amber-100 font-semibold text-sm transition-all duration-200 border border-amber-500/25 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  📝 Exam Mode
                </button>
                <button
                  onClick={() => navigate('roleplay')}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-600/20 to-green-700/10 hover:from-emerald-600/30 hover:to-green-700/20 text-emerald-200 hover:text-emerald-100 font-semibold text-sm transition-all duration-200 border border-emerald-500/25 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  💬 Roleplay
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Info Density - Key Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-4 rounded-2xl border border-orange-500/20 hover:border-orange-500/40 transition-all hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] group cursor-pointer">
            <p className="text-xs text-slate-500 group-hover:text-orange-300 transition-colors mb-1">Streak</p>
            <p className="text-2xl font-black text-orange-400 group-hover:text-orange-300">🔥 {profile.streak_days}</p>
            <p className="text-xs text-slate-600 group-hover:text-slate-500 mt-0.5">Best: {profile.longest_streak}</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] group cursor-pointer">
            <p className="text-xs text-slate-500 group-hover:text-blue-300 transition-colors mb-1">Total XP</p>
            <p className="text-2xl font-black text-blue-400 group-hover:text-blue-300">⚡ {Math.floor(profile.total_xp / 100)}</p>
            <p className="text-xs text-slate-600 group-hover:text-slate-500 mt-0.5">x100</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] group cursor-pointer">
            <p className="text-xs text-slate-500 group-hover:text-amber-300 transition-colors mb-1">Unlocked</p>
            <p className="text-2xl font-black text-amber-400 group-hover:text-amber-300">🏆 {unlockedCount}</p>
            <p className="text-xs text-slate-600 group-hover:text-slate-500 mt-0.5">{ACHIEVEMENTS.length - unlockedCount} left</p>
          </div>
        </div>

        {/* Next Action Section - ENGAGING */}
        <div className="glass-card p-6 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-600/10 to-slate-800/80 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] transition-all hover:border-purple-500/50 group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform">🎯</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                ✨ What's Next?
              </p>
              <p className="text-white font-semibold mb-1">
                Continue with <span style={{ color: recommendedTopic.color }} className="font-black">
                  {recommendedTopic.label}
                </span>
              </p>
              <p className="text-sm text-slate-300 mb-3">
                You're making great progress here. One more session and you'll unlock new skills!
              </p>
              <button
                onClick={() => navigate('practice')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] group-hover:scale-105"
              >
                Continue Learning <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon="🔥" value={profile.streak_days} label="Day Streak" color="orange" />
          <StatBox icon="⚡" value={profile.total_xp} label="Total XP" color="blue" />
          <StatBox icon="🏆" value={unlockedAchievements} label="Unlocked" color="amber" />
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Average Score</span>
            <span className="font-bold text-white">7.8 / 10</span>
          </div>
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-sm text-slate-400">Sessions This Week</span>
            <span className="font-bold text-white">5 / 7</span>
          </div>
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full w-5/7 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            icon="📚"
            title="Practice"
            subtitle="450+ questions"
            onClick={() => navigate('practice')}
            color="blue"
          />
          <QuickActionCard
            icon="🎓"
            title="Exam Mode"
            subtitle="IGCSE prep"
            onClick={() => navigate('exam')}
            color="amber"
          />
          <QuickActionCard
            icon="💬"
            title="Roleplay"
            subtitle="31 scenarios"
            onClick={() => navigate('roleplay')}
            color="emerald"
          />
          <QuickActionCard
            icon="📊"
            title="Progress"
            subtitle="Track skills"
            onClick={() => navigate('progress')}
            color="purple"
          />
        </div>

        {/* Latest Achievement */}
        {state.achievements.some(a => a.unlocked) && (
          <div className="glass-card p-6 rounded-2xl border border-amber-500/20">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Latest Achievement</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl">{state.achievements.find(a => a.unlocked)?.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-white">{state.achievements.find(a => a.unlocked)?.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {state.achievements.find(a => a.unlocked)?.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    orange: { bg: 'from-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    blue: { bg: 'from-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    amber: { bg: 'from-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    emerald: { bg: 'from-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  };

  const c = colors[color];
  return (
    <div className={`glass-card bg-gradient-to-br ${c.bg} to-transparent border ${c.border} p-4 rounded-2xl`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-2xl font-black ${c.text}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  onClick,
  color,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}) {
  const colors = {
    blue: 'from-blue-600/15 to-blue-800/5 border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    amber: 'from-amber-600/15 to-amber-800/5 border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    emerald: 'from-emerald-600/15 to-emerald-800/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    purple: 'from-purple-600/15 to-purple-800/5 border-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]',
  };

  return (
    <button
      onClick={onClick}
      className={`group bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02]`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-bold text-white text-sm">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </button>
  );
}
