import { motion } from 'framer-motion';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { scoreColor } from '../../domain/scoring';
import type { FeedbackScore } from '../../types/index';

interface Props {
  scores: FeedbackScore;
  wordCount?: number;
  xpEarned?: number;
  cefrLevel?: string;
  onContinue: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function SessionComplete({ scores, wordCount, xpEarned, cefrLevel, onContinue, onRetry, onBack }: Props) {
  const color = scoreColor(scores.overall);
  return (
    <div className="min-h-screen pb-24 md:pb-8 flex items-center justify-center">
      <motion.div
        className="max-w-md mx-auto px-4 w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="relative overflow-hidden rounded-2xl glass-elevated border-violet-electric/20 p-8 text-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-violet-electric/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <motion.div
              className="text-5xl mb-4"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-1">Session Complete</h2>
            <p className="text-slate-500 text-sm mb-5">You're crushing it!</p>

            <motion.div
              className="text-5xl font-black mb-1"
              style={{ color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              {scores.overall.toFixed(1)}
            </motion.div>
            <p className="text-[10px] text-slate-600 mb-5">out of 10.0</p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { value: `+${xpEarned ?? 25}`, label: 'XP', color: 'text-emerald-400' },
                { value: String(wordCount ?? '—'), label: 'Words', color: 'text-primary' },
                { value: cefrLevel ?? '—', label: 'CEFR', color: 'text-amber-400' },
              ].map(stat => (
                <div key={stat.label} className="p-2.5 rounded-xl glass-subtle">
                  <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <motion.button
                onClick={onContinue}
                className="w-full btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Continue <ChevronRight size={14} />
              </motion.button>
              <div className="flex gap-2">
                <motion.button
                  onClick={onRetry}
                  className="flex-1 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs flex items-center justify-center gap-1"
                  whileTap={{ scale: 0.97 }}
                >
                  <RotateCcw size={11} /> Retry
                </motion.button>
                <motion.button
                  onClick={onBack}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 hover:border-white/15 text-slate-500 hover:text-white font-semibold text-xs transition-all"
                  whileTap={{ scale: 0.97 }}
                >
                  Back
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
