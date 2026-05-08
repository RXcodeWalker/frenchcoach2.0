import { ChevronRight, Flame, Zap } from 'lucide-react';
import type { Screen } from '../types';

interface MomentumBuilderProps {
  currentStreak: number;
  sessionsToday: number;
  dailyGoal: number;
  onContinue: (screen: Screen) => void;
}

export function MomentumBuilder({ currentStreak, sessionsToday, dailyGoal, onContinue }: MomentumBuilderProps) {
  const isGoalComplete = sessionsToday >= dailyGoal;
  const percentToGoal = Math.round((sessionsToday / dailyGoal) * 100);

  return (
    <div className="glass-card p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Momentum</h3>
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-orange-400" />
          <span className="text-xs font-bold text-orange-400">{currentStreak}-day streak</span>
        </div>
      </div>

      {isGoalComplete ? (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-white mb-1">Daily goal complete!</p>
          <p className="text-sm text-slate-400 mb-4">You're on fire! Want to keep going?</p>
          <button
            onClick={() => onContinue('practice')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 font-semibold text-sm transition-all duration-200"
          >
            <Zap size={14} />
            Keep the Streak Alive
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-slate-400">{dailyGoal - sessionsToday} sessions left</span>
            <span className="text-xs font-bold text-blue-400">{percentToGoal}%</span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500"
              style={{ width: `${percentToGoal}%` }}
            />
          </div>
          <button
            onClick={() => onContinue('practice')}
            className="w-full py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 font-semibold text-sm transition-all duration-200"
          >
            Continue to Next Session
          </button>
        </div>
      )}
    </div>
  );
}

export function StreakGauge({ days, maxDays = 30 }: { days: number; maxDays?: number }) {
  const percentage = (days / maxDays) * 100;
  const isBurning = days >= 7;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-white">{days} day streak</span>
          <span className="text-xs text-slate-500">{percentage.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBurning
                ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                : 'bg-gradient-to-r from-amber-500 to-orange-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="text-2xl animate-bounce">{isBurning ? '🔥' : '❄️'}</span>
    </div>
  );
}

export function FocusCard({
  title,
  metric,
  icon,
  color,
  action,
}: {
  title: string;
  metric: string;
  icon: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  action?: { label: string; onClick: () => void };
}) {
  const colors = {
    blue: { bg: 'from-blue-500/10 to-cyan-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
    emerald: { bg: 'from-emerald-500/10 to-green-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    amber: { bg: 'from-amber-500/10 to-orange-500/5', border: 'border-amber-500/20', text: 'text-amber-400' },
    purple: { bg: 'from-purple-500/10 to-pink-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
  };

  const c = colors[color];

  return (
    <div className={`glass-card bg-gradient-to-br ${c.bg} border ${c.border} p-4 rounded-2xl`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-sm font-bold ${c.text}`}>{metric}</span>
      </div>
      <p className="text-sm text-slate-300 font-semibold mb-3">{title}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`w-full py-1.5 rounded-lg text-xs font-semibold ${c.text} hover:${c.bg} transition-all duration-200`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
