import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown, ArrowUp } from 'lucide-react';

export type MidSessionToastVariant = 'progress' | 'difficulty-up' | 'difficulty-down';

interface Props {
  show: boolean;
  /** docs §14 — defaults to 'progress' so every existing call site (the "Halfway there!" toast) is unchanged. */
  variant?: MidSessionToastVariant;
  questionsCompleted: number;
  targetCount: number;
  avgScore: number | null;
  onDismiss: () => void;
}

/** docs §8.4 — exact copy for the two difficulty variants. */
const DIFFICULTY_COPY: Record<'difficulty-up' | 'difficulty-down', { title: string; body: string }> = {
  'difficulty-down': {
    title: 'Easing off',
    body: 'The next few questions sit right at your level.',
  },
  'difficulty-up': {
    title: 'Stepping up',
    body: 'Adding a question that pushes you a bit.',
  },
};

export function MidSessionToast({ show, variant = 'progress', questionsCompleted, targetCount, avgScore, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  const isAboveAvg = avgScore !== null && avgScore >= 7;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-20 right-4 z-50 max-w-xs"
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          {variant === 'progress' ? (
            <div className="glass-elevated border-violet-electric/25 p-4 rounded-2xl shadow-xl space-y-1">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-violet-400" />
                <p className="text-sm font-black text-white">Halfway there!</p>
              </div>
              <p className="text-xs text-ink-muted leading-snug">
                {questionsCompleted}/{targetCount} done
                {avgScore !== null && ` · Avg ${avgScore.toFixed(1)}`}
              </p>
              {isAboveAvg && (
                <p className="text-[10px] text-emerald-400 font-bold">Above your personal average ↑</p>
              )}
            </div>
          ) : (
            <div className="glass-elevated border-violet-electric/25 p-4 rounded-2xl shadow-xl space-y-1">
              <div className="flex items-center gap-2">
                {variant === 'difficulty-down' ? (
                  <ArrowDown size={14} className="text-violet-400" />
                ) : (
                  <ArrowUp size={14} className="text-violet-400" />
                )}
                <p className="text-sm font-black text-white">{DIFFICULTY_COPY[variant].title}</p>
              </div>
              <p className="text-xs text-ink-muted leading-snug">{DIFFICULTY_COPY[variant].body}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
