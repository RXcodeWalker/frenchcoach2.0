import { ChevronLeft, Settings, Flame, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';

interface TopContextBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function TopContextBar({ title, subtitle, showBack, onBack, action }: TopContextBarProps) {
  const { state, dispatch } = useApp();

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        {showBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="flex-1">
          <p className="text-sm font-bold text-white">{title || 'FrenchCoach'}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {action || (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400">{state.profile.streak_days}</span>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'settings' })}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <Settings size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export function BottomNavigation() {
  const { state, dispatch } = useApp();

  const navItems: { id: Screen; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'practice', label: 'Learn', icon: '📚' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-40 flex items-center justify-around px-4 md:hidden">
      {navItems.map(item => {
        const active = state.screen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.id })}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 ${
              active
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
