import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  streak: number;
  show: boolean;
  onDismiss: () => void;
}

export function StreakToast({ streak, show, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, streak >= 5 ? 3000 : 2000);
    return () => clearTimeout(t);
  }, [show, streak, onDismiss]);

  const isOnFire = streak >= 5;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: -20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.85 }}
          transition={{ type: 'spring', damping: 18, stiffness: 250 }}
        >
          <div className={`px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 ${
            isOnFire
              ? 'bg-orange-500/15 border-orange-500/30'
              : 'surface-raised border-orange-500/20'
          }`}>
            <span className="text-xl">{isOnFire ? '🔥🔥' : '🔥'}</span>
            <div>
              <p className="text-sm font-black text-white">{isOnFire ? 'On Fire!' : 'Hot streak!'}</p>
              <p className="text-[10px] text-orange-400">{streak} correct in a row</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
