import { Trophy, TrendingUp, Zap, ChevronRight, RotateCcw } from 'lucide-react';

interface ResultsShowcaseProps {
  title: string;
  score: number;
  maxScore?: number;
  band?: string;
  xpEarned: number;
  improvementPercent?: number;
  stats: { label: string; value: string | number }[];
  onNext: () => void;
  onRetry?: () => void;
}

export function ResultsShowcase({
  title,
  score,
  maxScore = 10,
  band,
  xpEarned,
  improvementPercent,
  stats,
  onNext,
  onRetry,
}: ResultsShowcaseProps) {
  const percentage = (score / maxScore) * 100;
  const isExcellent = score >= 8;
  const isGood = score >= 6 && score < 8;
  const color = isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Hero Result Card */}
      <div className="glass-card p-8 rounded-3xl text-center relative overflow-hidden border-2 border-blue-500/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>

          <div className="text-6xl font-black mb-3" style={{ color }}>
            {score.toFixed(1)}
          </div>

          <div className="text-sm text-slate-400 mb-6">out of {maxScore}</div>

          {band && <p className="text-lg font-bold text-slate-300 mb-6">{band}</p>}

          {/* Result Bar */}
          <div className="mb-8">
            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(to right, ${color}, ${color}88)`,
                  boxShadow: `0 0 12px ${color}40`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500">{percentage.toFixed(0)}% of maximum</p>
          </div>

          {/* XP Earned */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 mb-6">
            <Zap size={16} className="text-emerald-400" />
            <span className="font-bold text-emerald-400">+{xpEarned} XP</span>
          </div>

          {/* Improvement */}
          {improvementPercent && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-semibold">
              <TrendingUp size={14} />
              {improvementPercent}% improvement
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className="text-xl font-black" style={{ color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onRetry && (
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02]">
            <RotateCcw size={16} />
            Try Again
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
