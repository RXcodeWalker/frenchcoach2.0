import { useApp } from '../context/AppContext';
import type { Screen } from '../types';
import { Hop as Home, BookOpen, GraduationCap, ChartBar as BarChart3, User, Compass, Flame } from 'lucide-react';

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={20} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={20} /> },
  { id: 'exam', label: 'Exam', icon: <GraduationCap size={20} /> },
  { id: 'explore', label: 'Explore', icon: <Compass size={20} /> },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];

export function SideRail() {
  const { state, dispatch } = useApp();

  return (
    <>
      {/* Desktop Side Rail */}
      <nav className="fixed left-0 top-0 bottom-0 w-[72px] bg-slate-950/80 backdrop-blur-2xl border-r border-white/[0.04] z-50 hidden md:flex flex-col items-center py-4 gap-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <span className="text-lg font-black text-white">F</span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = state.screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.id })}
                className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active
                    ? 'bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
                {item.icon}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Flame size={16} className="text-orange-400" />
          </div>
          <span className="text-[10px] font-bold text-orange-400">{state.profile.streak_days}</span>
        </div>
      </nav>

      {/* Mobile Bottom Dock */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-3 mb-3 px-2 py-2 bg-slate-900/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.slice(0, 5).map(item => {
              const active = state.screen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.id })}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
                    active ? 'text-blue-400' : 'text-slate-500'
                  }`}
                >
                  <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                  {active && (
                    <div className="w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
