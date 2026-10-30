import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { fill } from '../../components/motion/variants';
import { topicOf } from './bank';
import { getBoss, type FightId } from './bosses';
import { bossVisual } from './bossVisuals';
import { FOCUS_MAX } from './engine';

/** A boss's icon chip — the only place its hue appears. */
export function BossChip({ id, size = 48, className = '' }: { id: FightId; size?: number; className?: string }) {
  const { Icon, hue } = bossVisual(id);
  return (
    <span
      aria-hidden="true"
      className={`topic-chip flex shrink-0 items-center justify-center ${className}`}
      style={{ '--h': hue, width: size, height: size, borderRadius: size >= 40 ? 10 : 8 } as CSSProperties}
    >
      <Icon size={size >= 48 ? 24 : size >= 32 ? 20 : 14} strokeWidth={1.75} />
    </span>
  );
}

/** Which grammar topic a question comes from — shown in the Gauntlet, where it changes every round. */
export function TopicTag({ questionId, className = '' }: { questionId: string; className?: string }) {
  const id = topicOf(questionId);
  const boss = id ? getBoss(id) : undefined;
  if (!boss) return null;
  return (
    <span data-testid="boss-topic" className={`inline-flex items-center gap-2 text-caption text-ink-muted ${className}`}>
      <BossChip id={boss.id} size={24} />
      {boss.topic}
    </span>
  );
}

/** A health bar. It fills with the `fill` motion and jumps under reduced motion. */
export function HpBar({ value, max, tone, label }: { value: number; max: number; tone: 'boss' | 'player'; label: string }) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2.5 w-full overflow-hidden rounded-pill bg-track"
    >
      <motion.div
        className={`h-full rounded-pill ${tone === 'boss' ? 'bg-correction' : 'bg-progress'}`}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={reduced ? { duration: 0 } : fill(0)}
      />
    </div>
  );
}

/** The Focus meter: one pip per charge. */
export function FocusPips({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`Focus ${value} of ${FOCUS_MAX}`} className="inline-flex items-center gap-1.5">
      {Array.from({ length: FOCUS_MAX }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-pill border ${i < value ? 'border-action bg-action' : 'border-hairline-strong bg-transparent'}`}
        />
      ))}
    </span>
  );
}

type PillTone = 'bad' | 'good' | 'info' | 'neutral';

const PILL: Record<PillTone, string> = {
  bad: 'border-correction text-correction-text bg-correction-soft',
  good: 'border-progress text-progress-text bg-progress-soft',
  info: 'border-hairline-strong text-info-text bg-info-soft',
  neutral: 'border-hairline-strong text-ink-muted',
};

/** A status on a fighter: Guard up, Poisoned, Stunned, a locked move. */
export function StatusPill({ tone, icon, children }: { tone: PillTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5 text-label ${PILL[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

/** Earned stars out of three, readable as one label. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} of 3 stars`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.75}
          aria-hidden="true"
          className={n <= value ? 'fill-current text-reward-text' : 'text-hairline-strong'}
        />
      ))}
    </span>
  );
}
