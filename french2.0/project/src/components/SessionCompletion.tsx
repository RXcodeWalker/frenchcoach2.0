import { ChevronRight, RotateCcw, Zap, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';

interface SessionCompletionProps {
  score: number;
  maxScore?: number;
  xpEarned: number;
  wordCount: number;
  skillImprovement?: { name: string; before: number; after: number };
  onNext: () => void;
  onRetry: () => void;
  suggestedNextAction?: Screen;
  message?: string;
}

export function SessionCompletion({
  score,
  maxScore = 10,
  xpEarned,
  wordCount,
  skillImprovement,
  onNext,
  onRetry,
  suggestedNextAction = 'dashboard',
  message = "Keep pushing!",
}: SessionCompletionProps) {
  const { dispatch } = useApp();
  const percentage = Math.round((score / maxScore) * 100);
  const isExcellent = score >= 8;
  const isGood = score >= 6 && score < 8;

  const performanceColor = isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#ef4444';
  const performanceLabel = isExcellent ? 'Excellent' : isGood ? 'Good' : 'Keep Improving';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Celebration burst effect */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              animation: `floatUp 1.5s ease-out ${i * 0.1}s forwards`,
              transform: `rotate(${i * 45}deg) translateY(-50px)`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 border border-blue-500/40 shadow-[0_0_80px_rgba(59,130,246,0.3)] animate-fade-in relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Celebration elements */}
        <div className="text-center mb-8 relative z-10">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Session Complete!
          </h2>
          <p className="text-slate-300 text-lg font-semibold">{message}</p>
        </div>

        {/* Score Display */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Your Score</span>
            <span className="text-xs text-slate-500">{performanceLabel}</span>
          </div>

          <div className="flex items-end gap-6">
            <div>
              <div className="text-5xl font-black mb-1" style={{ color: performanceColor }}>
                {score.toFixed(1)}
              </div>
              <div className="text-sm text-slate-400">/ {maxScore}</div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 h-12 bg-slate-700/50 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000 flex items-center justify-center"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(to right, ${performanceColor}, ${performanceColor}88)`,
                  boxShadow: `0 0 12px ${performanceColor}40`,
                }}
              >
                <span className="text-xs font-bold text-white">{percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-xs text-slate-400">XP Earned</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">+{xpEarned}</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-400">📝 Words</span>
            </div>
            <p className="text-2xl font-black text-blue-400">{wordCount}</p>
          </div>

          {skillImprovement && (
            <>
              <div className="col-span-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-purple-400" />
                  <span className="text-xs text-slate-400">Skill Improvement</span>
                </div>
                <p className="text-sm text-purple-300">
                  <span className="font-bold">{skillImprovement.name}</span>
                  {' '}
                  <span className="text-white font-black">{skillImprovement.before}% → {skillImprovement.after}%</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNext}
            className="w-full btn-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
          >
            <span>Continue</span>
            <ChevronRight size={18} />
          </button>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Try Again
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: suggestedNextAction })}
              className="flex-1 py-3 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white font-semibold text-sm transition-all duration-200"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
