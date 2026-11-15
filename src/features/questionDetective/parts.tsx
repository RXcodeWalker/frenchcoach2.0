import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lightbulb, X } from 'lucide-react';
import { enter, enterReduced, fill } from '../../components/motion/variants';

/**
 * Small shared pieces for the Question Detective screens (Design System v2):
 * a card that rises in, an icon chip, a progress track, and the feedback
 * panel. Colour comes from role tokens only; the only motions are `enter`
 * and `fill`.
 */

/** A card that rises in (the `enter` motion), used for anything that appears after a tap. */
export function Rise({
  children,
  className = '',
  testId,
  id,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
  id?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className={className}
      data-testid={testId}
      id={id}
    >
      {children}
    </motion.div>
  );
}

type ChipTone = 'action' | 'progress' | 'info' | 'neutral';

const chipClass: Record<ChipTone, string> = {
  action: 'bg-action-soft text-action-text',
  progress: 'bg-progress-soft text-progress-text',
  info: 'bg-info-soft text-info-text',
  neutral: 'bg-surface-recessed text-ink-muted',
};

/** A 32px rounded square holding one icon. Decorative, so hidden from screen readers. */
export function IconChip({ icon, tone = 'action', size = 32 }: { icon: ReactNode; tone?: ChipTone; size?: 32 | 40 }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-control ${size === 40 ? 'h-10 w-10' : 'h-8 w-8'} ${chipClass[tone]}`}
    >
      {icon}
    </span>
  );
}

/**
 * Progress through a fixed number of steps. Done segments are progress green,
 * the current one is the action colour, the rest are the track. Segments fill
 * with the `fill` motion.
 */
export function StepTrack({
  total,
  done,
  current,
  label,
}: {
  total: number;
  /** How many segments are complete. */
  done: number;
  /** Highlight the next segment as the one in progress. */
  current?: boolean;
  label: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => {
        const complete = i < done;
        const active = !complete && current && i === done;
        return (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-pill bg-track">
            <motion.div
              className={`h-full rounded-pill ${complete ? 'bg-progress' : 'bg-action'}`}
              initial={false}
              animate={{ width: complete ? '100%' : active ? '35%' : '0%' }}
              transition={reduced ? { duration: 0 } : fill(0)}
            />
          </div>
        );
      })}
    </div>
  );
}

type PanelTone = 'right' | 'wrong' | 'hint' | 'neutral';

const panelClass: Record<PanelTone, string> = {
  right: 'border-progress bg-progress-soft',
  wrong: 'border-hairline bg-surface-recessed',
  hint: 'border-hairline bg-info-soft',
  neutral: 'border-hairline bg-surface',
};

const panelText: Record<PanelTone, string> = {
  right: 'text-progress-text',
  wrong: 'text-correction-text',
  hint: 'text-info-text',
  neutral: 'text-ink',
};

/**
 * The feedback strip after an answer: an icon, a one-line headline in the
 * role colour and, when there is more to say, plain body text under it. The
 * icon means colour is never the only signal.
 */
export function FeedbackPanel({
  tone,
  title,
  children,
  testId,
}: {
  tone: PanelTone;
  title: string;
  children?: ReactNode;
  testId?: string;
}) {
  const Icon = tone === 'right' ? Check : tone === 'hint' ? Lightbulb : X;
  return (
    <div className={`flex gap-3 rounded-card border p-4 ${panelClass[tone]}`} data-testid={testId}>
      {tone !== 'neutral' && (
        <span aria-hidden="true" className={`mt-0.5 shrink-0 ${panelText[tone]}`}>
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0">
        <p className={`text-section ${panelText[tone]}`}>{title}</p>
        {children != null && children !== false && <div className="mt-1 text-body-s text-ink">{children}</div>}
      </div>
    </div>
  );
}
