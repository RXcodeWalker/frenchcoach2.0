import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { DUR, EASE, enter, enterReduced, slide } from '../../../components/motion/variants';

/**
 * One section of the feedback's Breakdown tab: an icon in a soft tile, a
 * sentence-case title, an optional count or aside, then the body. Collapsible
 * sections open and close with the `slide` motion on the chevron; the body is
 * a plain height reveal. Colour comes only from role tokens.
 */

export type BreakdownTone = 'action' | 'progress' | 'reward' | 'correction' | 'info' | 'neutral';

const TILE: Record<BreakdownTone, string> = {
  action: 'bg-action-soft text-action-text',
  progress: 'bg-progress-soft text-progress-text',
  reward: 'bg-reward-soft text-reward-text',
  correction: 'bg-correction-soft text-correction-text',
  info: 'bg-info-soft text-info-text',
  neutral: 'surface-recessed text-ink-muted',
};

interface Props {
  title: string;
  icon: LucideIcon;
  tone?: BreakdownTone;
  /** A count shown as a pill next to the title. */
  count?: number;
  /** A short line under the title. */
  subtitle?: ReactNode;
  /** Right side of the header (e.g. "Open all lessons"); not shown on a collapsible card. */
  aside?: ReactNode;
  /** Collapsible when set; the value is whether it starts open. */
  collapsible?: { defaultOpen: boolean };
  /** A stronger frame for the one card that leads the tab. */
  emphasis?: boolean;
  children: ReactNode;
  testId?: string;
  /** A jump target for the hero's counts. */
  section?: string;
}

export function BreakdownCard({ title, icon: Icon, tone = 'neutral', count, subtitle, aside, collapsible, emphasis, children, testId, section }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(collapsible?.defaultOpen ?? true);
  const bodyId = useId();
  const isOpen = !collapsible || open;

  const heading = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${TILE[tone]}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-section text-ink">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="rounded-pill bg-track px-2 py-0.5 font-numeral text-caption text-ink">{count}</span>
          )}
        </span>
        {subtitle && <span className="mt-0.5 block text-caption text-ink-muted">{subtitle}</span>}
      </span>
    </span>
  );

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      aria-label={title}
      data-testid={testId}
      data-section={section}
      className={`rounded-card border bg-surface p-4 ${emphasis ? 'border-hairline-strong shadow-card' : 'border-hairline'}`}
    >
      {collapsible ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-left"
        >
          {heading}
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={slide} className="text-ink-subtle" aria-hidden="true">
            <ChevronDown size={18} />
          </motion.span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {heading}
          {aside}
        </div>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={bodyId}
            initial={collapsible && !reduced ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? DUR.reduced : DUR.slide, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
