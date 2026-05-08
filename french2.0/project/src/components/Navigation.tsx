import { LayoutDashboard, BookOpen, GraduationCap, TrendingUp, Settings, MessageSquare, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';
import { getLevelInfo } from '../data/gameData';

const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { screen: 'practice', label: 'Practice', icon: <BookOpen size={20} /> },
  { screen: 'exam', label: 'Exam Mode', icon: <GraduationCap size={20} /> },
  { screen: 'roleplay', label: 'Roleplay', icon: <MessageSquare size={20} /> },
  { screen: 'progress', label: 'Progress', icon: <TrendingUp size={20} /> },
  { screen: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export function Navigation() {
  const { state, dispatch } = useApp();
  const { current, progress } = getLevelInfo(state.profile.total_xp);

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 nav-panel">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <span className="text-xl">🇫🇷</span>
          </div>
          <div>
            <h1 className="font-black text-white text-lg leading-none">FrenchCoach</h1>
            <p className="text-xs text-slate-400 mt-0.5">IGCSE Prep Platform</p>
          </div>
        </div>
      </div>

      {/* User XP Card */}
      <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-white">{state.profile.username}</p>
            <p className="text-xs text-slate-400">{current.icon} {current.level}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-400/15 px-2 py-1 rounded-lg border border-amber-400/20">
            <Zap size={12} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{state.profile.total_xp.toLocaleString()}</span>
          </div>
        </div>
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">{Math.round(progress)}% to next level</p>
      </div>

      {/* Streak */}
      <div className="mx-4 mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
        <div className="text-2xl">🔥</div>
        <div>
          <p className="text-sm font-bold text-white">{state.profile.streak_days} Day Streak</p>
          <p className="text-xs text-slate-400">Best: {state.profile.longest_streak} days</p>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 p-4 space-y-1 mt-2">
        {NAV_ITEMS.map(item => {
          const active = state.screen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.screen })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-blue-400' : ''}`}>
                {item.icon}
              </span>
              {item.label}
              {item.screen === 'exam' && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold">
                  IGCSE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-white/5">
        <p className="text-xs text-slate-600 text-center">French Coach v2.0</p>
      </div>
    </nav>
  );
}
