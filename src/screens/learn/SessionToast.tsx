import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { enter } from '../../components/motion/variants';

interface Props {
  icon: ReactNode;
  /** Classes for the 32px icon box: a role's soft ground and text. */
  iconClass: string;
  title: ReactNode;
  body: ReactNode;
  onDismiss: () => void;
}

/**
 * A session toast (Design System v2): a raised card, max 380px, centred under
 * the top bar — a 32px role-coloured icon box, a 14/600 title, a 13px body and
 * a 44px dismiss. Enters with the `enter` motion; never pulses.
 */
export function SessionToast({ icon, iconClass, title, body, onDismiss }: Props) {
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
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${iconClass}`} aria-hidden="true">{icon}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          <span className="text-[13px] text-ink-muted">{body}</span>
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
  );
}
