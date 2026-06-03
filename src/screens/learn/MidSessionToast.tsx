import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface Props {
  show: boolean;
  questionsCompleted: number;
  targetCount: number;
  avgScore: number | null;
  onDismiss: () => void;
}

export function MidSessionToast({ show, questionsCompleted, targetCount, avgScore, onDismiss }: Props) {
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
          <div className="glass-elevated border-violet-electric/25 p-4 rounded-2xl shadow-xl space-y-1">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-violet-400" />
              <p className="text-sm font-black text-white">Halfway there!</p>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {questionsCompleted}/{targetCount} done
              {avgScore !== null && ` · Avg ${avgScore.toFixed(1)}`}
            </p>
            {isAboveAvg && (
              <p className="text-[10px] text-emerald-400 font-bold">Above your personal average ↑</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
