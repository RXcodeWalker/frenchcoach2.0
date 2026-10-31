import { motion } from 'framer-motion';
import { SkipForward, X } from 'lucide-react';
import { enter } from '../../components/motion/variants';

interface Props {
  onUndo: () => void;
  onDismiss: () => void;
}

/** Shown for a few seconds after a skip: the same raised card as the session toasts, with an Undo. */
export function SkipUndoToast({ onUndo, onDismiss }: Props) {
  return (
    <motion.div
      variants={enter}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      role="status"
      className="pointer-events-none fixed left-0 right-0 top-20 z-50 flex justify-center px-4 md:left-[88px]"
    >
      <div className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-card border border-hairline-strong bg-surface-raised py-2 pl-3.5 pr-2 shadow-overlay">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-info-soft text-info-text" aria-hidden="true">
          <SkipForward size={16} />
        </span>
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink">Question skipped</span>
        <button
          type="button"
          onClick={onUndo}
          aria-keyshortcuts="u"
          title="Undo (U)"
          className="flex h-11 shrink-0 items-center rounded-control px-3 text-[14px] font-semibold text-action-text transition-colors duration-state ease-smooth hover:bg-track"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
