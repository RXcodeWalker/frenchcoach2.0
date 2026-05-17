import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';
import { Home, BookOpen, GraduationCap, BarChart3, User, Compass, Flame, Users, ShoppingBag, Trophy, Info } from 'lucide-react';

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode; glowColor: string }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} />, glowColor: 'rgb(var(--color-primary))' },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={18} />, glowColor: '#0EA5E9' },
  { id: 'exam', label: 'Exam', icon: <GraduationCap size={18} />, glowColor: '#F59E0B' },
  { id: 'shop', label: 'Shop', icon: <ShoppingBag size={18} />, glowColor: '#EC4899' },
  { id: 'explore', label: 'Explore', icon: <Compass size={18} />, glowColor: '#06B6D4' },
  { id: 'study-groups', label: 'Groups', icon: <Users size={18} />, glowColor: '#10B981' },
  { id: 'rankings', label: 'Rankings', icon: <Trophy size={18} />, glowColor: '#F59E0B' },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} />, glowColor: '#8B5CF6' },
  { id: 'profile', label: 'Profile', icon: <User size={18} />, glowColor: 'rgb(var(--color-primary))' },
  { id: 'about', label: 'About', icon: <Info size={18} />, glowColor: '#94A3B8' },
];

const toPath = (id: Screen): string => id === 'home' ? '/' : `/${id}`;

export function SideRail() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* Desktop Side Rail */}
      <nav className="nav-rail fixed left-0 top-0 bottom-0 w-[64px] glass border-r border-white/[0.04] z-50 hidden md:flex flex-col items-center py-5 gap-1">
        {/* Logo */}
        <motion.div
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-variant flex items-center justify-center mb-8 animate-icon-glow"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{ boxShadow: '0 0 20px rgba(var(--color-primary), 0.35)' }}
        >
          <span className="text-sm font-black text-white">F</span>
        </motion.div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === toPath(item.id);
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(toPath(item.id))}
                className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                  active
                    ? 'text-primary'
                    : 'text-slate-600 hover:text-slate-300'
                }`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                {/* Active glow background */}
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    style={{ boxShadow: '0 0 16px rgba(var(--color-primary), 0.2)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {/* Active indicator line */}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-3 w-[2.5px] h-4 bg-primary rounded-r-full"
                    style={{ boxShadow: '0 0 8px rgba(var(--color-primary), 0.7)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span
                  className="relative z-10"
                  style={{
                    color: active ? item.glowColor : undefined,
                    filter: active ? `drop-shadow(0 0 6px ${item.glowColor})` : undefined,
                  }}
                >
                  {item.icon}
                </span>
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
      <nav className="nav-rail fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-3 mb-3 px-1.5 py-1.5 glass-elevated rounded-2xl">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.slice(0, 5).map(item => {
              const active = location.pathname === toPath(item.id);
              return (
                <motion.button
                  key={item.id}
                  onClick={() => navigate(toPath(item.id))}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors duration-200 ${
                    active ? 'text-primary' : 'text-slate-400'
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-glow"
                      className="absolute inset-0 rounded-xl bg-primary/8"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <div
                    className="relative z-10"
                    style={{
                      color: active ? item.glowColor : undefined,
                      filter: active ? `drop-shadow(0 0 4px ${item.glowColor})` : undefined,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-bold relative z-10">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-dot"
                      className="w-1 h-1 rounded-full bg-primary"
                      style={{ boxShadow: '0 0 6px rgba(var(--color-primary), 0.8)' }}
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
