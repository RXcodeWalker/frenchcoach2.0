import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target } from 'lucide-react';

interface Props {
  label: string | null;
  detail?: string | null;
  onDismiss: () => void;
}

export function ObjectiveClearedToast({ label, detail, onDismiss }: Props) {
  useEffect(() => {
    if (!label) return;
    const t = setTimeout(onDismiss, 2400);
    return () => clearTimeout(t);
  }, [label, onDismiss]);

  return (
    <AnimatePresence>
      {label && (
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        >
          <div className="px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 bg-emerald-500/15 border-emerald-500/30 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Target size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-300">{label}</p>
              {detail ? (
                <p className="text-[10px] text-emerald-500/80 font-bold line-clamp-1 max-w-[220px]">
                  {detail}
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
