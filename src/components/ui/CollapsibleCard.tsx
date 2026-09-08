import { useState, useId, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp } from '../motion/variants';

interface Props {
  title: string;
  icon?: ReactNode;
  badgeCount?: number;
  defaultOpen?: boolean;
  /** Forces open state from outside (e.g. transcript click) */
  forceOpen?: boolean;
  /** Flashes a ring when triggered from outside */
  highlight?: boolean;
  className?: string;
  children: ReactNode;
}

export function CollapsibleCard({
  title, icon, badgeCount, defaultOpen = false,
  forceOpen, highlight, className = '', children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const isOpen = forceOpen ?? open;

  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-xl surface overflow-hidden transition-shadow duration-300 ${highlight ? 'ring-1 ring-violet-400/60' : ''} ${className}`}
    >
      <button
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => { if (!forceOpen) setOpen(o => !o); }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {icon && <span className="text-base">{icon}</span>}
        <span className="flex-1 text-xs font-bold text-white">{title}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-[9px] font-bold text-ink-muted">{badgeCount}</span>
        )}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-ink-subtle"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
