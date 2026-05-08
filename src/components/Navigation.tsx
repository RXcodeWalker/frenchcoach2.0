import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';
import { Home, BookOpen, GraduationCap, BarChart3, User, Compass, Flame } from 'lucide-react';

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={18} /> },
  { id: 'exam', label: 'Exam', icon: <GraduationCap size={18} /> },
  { id: 'explore', label: 'Explore', icon: <Compass size={18} /> },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

export function SideRail() {
  const { state, dispatch } = useApp();

  return (
    <>
      {/* Desktop Side Rail */}
      <nav className="fixed left-0 top-0 bottom-0 w-[64px] glass border-r border-white/[0.04] z-50 hidden md:flex flex-col items-center py-5 gap-1">
        {/* Logo */}
        <motion.div
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-electric to-indigo-500 flex items-center justify-center mb-8"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{ boxShadow: '0 0 20px rgba(124, 58, 237, 0.35)' }}
        >
          <span className="text-sm font-black text-white">F</span>
        </motion.div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          {NAV_ITEMS.map(item => {
            const active = state.screen === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.id })}
                className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                  active
                    ? 'text-violet-400'
                    : 'text-slate-600 hover:text-slate-300'
                }`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                {/* Active glow background */}
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-lg bg-violet-electric/10"
                    style={{ boxShadow: '0 0 16px rgba(124, 58, 237, 0.2)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {/* Active indicator line */}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 bg-violet-400 rounded-r-full"
                    style={{ boxShadow: '0 0 8px rgba(124, 58, 237, 0.7)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                {/* Tooltip */}
                <div className="absolute left-full ml-2.5 px-2 py-1 bg-navy-200 border border-white/10 rounded-md text-[10px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                  {item.label}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1.5 mb-1">
          <motion.div
            className="w-9 h-9 rounded-lg bg-orange-500/8 border border-orange-500/15 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
          >
            <Flame size={14} className="text-orange-400" />
          </motion.div>
          <span className="text-[9px] font-bold text-orange-400">{state.profile.streak_days}</span>
        </div>
      </nav>

      {/* Mobile Bottom Dock */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-3 mb-3 px-1.5 py-1.5 glass-elevated rounded-2xl">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.slice(0, 5).map(item => {
              const active = state.screen === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.id })}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors duration-200 ${
                    active ? 'text-violet-400' : 'text-slate-600'
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-glow"
                      className="absolute inset-0 rounded-xl bg-violet-electric/8"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10">{item.icon}</div>
                  <span className="text-[9px] font-semibold relative z-10">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-dot"
                      className="w-1 h-1 rounded-full bg-violet-400"
                      style={{ boxShadow: '0 0 6px rgba(124, 58, 237, 0.8)' }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
