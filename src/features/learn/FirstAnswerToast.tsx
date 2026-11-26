import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { firstAnswerCopy } from './firstAnswer';

/** How long the card stays before it leaves on its own. */
export const FIRST_ANSWER_VISIBLE_MS = 7000;

/**
 * The achievement card for a learner's first marked answer. Same family as the
 * returning-learner welcome (a raised card, one named motion, the neutral chord)
 * but with no confetti: a result screen never gets a burst (Design System v2),
 * and the card says nothing about how the answer went.
 */
export function FirstAnswerToast({ open, name, onDismiss }: { open: boolean; name?: string | null; onDismiss: () => void }) {
  const reduced = useReducedMotion();
  useSfxOnChange(open ? 'achievement' : null, open, 300);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onDismiss, FIRST_ANSWER_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [open, onDismiss]);
  const copy = firstAnswerCopy(name);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={reduced ? enterReduced : enter}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          role="status"
          data-testid="first-answer-toast"
          className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 md:left-[88px]"
        >
          <div className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3.5 rounded-card border border-hairline-strong bg-surface-raised py-3 pl-4 pr-2 shadow-overlay">
            <motion.span
              variants={celebrate}
              initial="hidden"
              animate="show"
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-progress-soft text-progress-text"
            >
              <Mic size={22} />
            </motion.span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-eyebrow uppercase text-progress-text">{copy.eyebrow}</span>
              <span className="text-[16px] font-semibold text-ink">{copy.title}</span>
              <span className="text-[13px] text-ink-muted">{copy.line}</span>
            </span>
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
      )}
    </AnimatePresence>
  );
}
