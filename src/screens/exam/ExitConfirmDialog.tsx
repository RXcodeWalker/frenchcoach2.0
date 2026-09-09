import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The exam-exit confirm (SCREENS §4): 480px, plain — no celebration surface,
 * a --scrim dim rather than a blur. Shared by the live exam, transcript review
 * and the scoring wait; the copy is accurate for all three (the recording so
 * far is saved, the timed attempt will not count).
 */
export function ExitConfirmDialog({ open, onCancel, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'var(--scrim)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-[480px] rounded-card surface-raised p-6 space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <p className="text-subtitle text-ink mb-1">End the exam?</p>
              <p className="text-body-s text-ink-muted leading-relaxed">
                Your recording so far is saved, but the timed attempt will not count.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="quiet" size="md" onClick={onCancel}>
                Keep going
              </Button>
              <Button variant="destructive" size="md" onClick={onConfirm}>
                End exam
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
