import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, X } from 'lucide-react';

export function LevelUpCelebration({ level, onDismiss }: { level: string; onDismiss: () => void }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm celebration-modal">
      <div
        className={`relative transition-all duration-500 ${
          animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        {/* Particle burst background */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
              style={{
                top: '50%',
                left: '50%',
                animation: `particleBurst 1.2s ease-out ${i * 0.1}s forwards`,
              }}
            />
          ))}
        </div>

        <div className="relative w-96 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-12 text-center border border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.3)]">
          <div className="text-6xl mb-4 animate-bounce" style={{ animationDelay: '0.2s' }}>
            ✨
          </div>

          <h2 className="text-4xl font-black text-white mb-2">LEVEL UP!</h2>
          <p className="text-2xl font-bold text-amber-400 mb-6">→ {level} ←</p>

          <p className="text-slate-300 mb-6 leading-relaxed">
            You've unlocked advanced challenges and earned new capabilities!
          </p>

          <div className="flex justify-center gap-3 mb-6">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <p className="text-xs text-slate-400">New Unlock</p>
              <p className="text-lg font-black text-emerald-400">Exam Mode</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <p className="text-xs text-slate-400">Bonus</p>
              <p className="text-lg font-black text-purple-400">+500 XP</p>
            </div>
          </div>

          {/* Confetti animation */}
          <div className="pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  background: ['#fbbf24', '#10b981', '#0ea5e9', '#ec4899'][Math.floor(Math.random() * 4)],
                  animation: `confetti 2s linear ${Math.random() * 0.5}s forwards`,
                }}
              />
            ))}
          </div>

          <button
            onClick={onDismiss}
            className="mt-6 w-full btn-primary py-3 rounded-xl font-bold text-lg"
          >
            Continue Learning
          </button>
        </div>
      </div>

      <style>{`
        @keyframes particleBurst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotateZ(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotateZ(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function AchievementUnlockedCelebration({
  name,
  icon,
  description,
  xpReward,
  onDismiss,
}: {
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  onDismiss: () => void;
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm celebration-modal">
      <div
        className={`relative transition-all duration-500 ${
          animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        <div className="relative w-80 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-10 text-center border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)]">
          <div className="text-7xl mb-4 animate-bounce">{icon}</div>

          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            Achievement Unlocked
          </p>
          <h3 className="text-3xl font-black text-white mb-2">{name}</h3>
          <p className="text-sm text-slate-300 mb-6">{description}</p>

          <div className="flex items-center justify-center gap-2 mb-6 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
            <Zap size={16} className="text-emerald-400" />
            <span className="font-bold text-emerald-400">+{xpReward} bonus XP</span>
          </div>

          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold text-sm transition-all duration-200"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}

export function StreakAtRiskAlert({ hoursLeft, onDismiss }: { hoursLeft: number; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full px-4">
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-xl animate-pulse">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">🔥</span>
          <div className="flex-1">
            <p className="font-bold text-red-300">Your streak is at risk!</p>
            <p className="text-sm text-red-200/80">Ends in {hoursLeft} hours</p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-300 hover:text-red-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <button className="w-full mt-3 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-all duration-200">
          Practice Now
        </button>
      </div>
    </div>
  );
}
