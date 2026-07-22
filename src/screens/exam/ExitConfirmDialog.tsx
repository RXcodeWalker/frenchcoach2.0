import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shared exit confirmation for the live exam, transcript review, and scoring screens — no autosave exists today, so exiting mid-exam genuinely discards progress. */
export function ExitConfirmDialog({ open, onCancel, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xs rounded-2xl glass-elevated p-5 text-center space-y-4"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div>
              <p className="text-sm font-bold text-white mb-1">Exit the exam?</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">Your progress won't be saved.</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <motion.button
                onClick={onCancel}
                className="flex-1 px-4 py-2 rounded-lg glass-subtle hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
                whileTap={{ scale: 0.95 }}
              >
                Keep going
              </motion.button>
              <motion.button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 transition-all font-semibold text-[10px]"
                whileTap={{ scale: 0.95 }}
              >
                Exit
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
