import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Heart, Target } from 'lucide-react';
import { Stat } from '../../../components/ui/Stat';
import { streakFlame } from '../../../components/motion/variants';
import type { EmojiAnswerHistoryEntry } from '../types';

/** The flame wiggle, played the moment the combo grows (the top bar delays it). */
const flameNow = { ...streakFlame, transition: { ...streakFlame.transition, delay: 0 } };

export function ComboChip({ streak }: { streak: number }) {
  const reduced = useReducedMotion();
  return (
    <Stat
      role={streak >= 2 ? 'streak' : 'neutral'}
      title="Current combo"
      icon={
        <motion.span key={streak} className="inline-flex" animate={streak >= 2 && !reduced ? flameNow : undefined}>
          <Flame size={14} aria-hidden="true" />
        </motion.span>
      }
    >
      Combo {streak}
    </Stat>
  );
}

/** The run's score is neutral on purpose: reward colour means XP, and this earns none. */
export function ScoreChip({ label, value, icon }: { label: string; value: number; icon?: ReactNode }) {
  return (
    <Stat role="neutral" title={label} icon={icon ?? <Target size={14} aria-hidden="true" />}>
      {label} {value}
    </Stat>
  );
}

export function Hearts({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${left} of ${total} lives left`}>
      {Array.from({ length: total }).map((_, i) => (
        <Heart
          key={i}
          size={22}
          aria-hidden="true"
          className={`transition-colors duration-state ${
            i < left ? 'fill-correction text-correction' : 'fill-transparent text-ink-subtle'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * One cell per question: green if you got it, red if not, violet for the one
 * in play. Colour is the role (progress / correction / action), and the
 * heading beside it carries the same information in words.
 */
export function ProgressCells({
  total,
  index,
  history,
}: {
  total: number;
  index: number;
  history: readonly EmojiAnswerHistoryEntry[];
}) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => {
        const done = history[i];
        const tone = done
          ? done.isCorrect
            ? 'bg-progress'
            : 'bg-correction'
          : i === index
            ? 'bg-action'
            : 'bg-track';
        return <span key={i} className={`h-2 flex-1 rounded-pill transition-colors duration-state ${tone}`} />;
      })}
    </div>
  );
}

/** A draining bar. The width steps once a second; the 1s linear transition smooths it. */
export function TimerBar({ timeLeft, maxTime, critical }: { timeLeft: number; maxTime: number; critical: boolean }) {
  const pct = maxTime > 0 ? Math.max(0, Math.min(100, (timeLeft / maxTime) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Time left"
      aria-valuemin={0}
      aria-valuemax={maxTime}
      aria-valuenow={Math.ceil(timeLeft)}
      className="h-2 w-full overflow-hidden rounded-pill bg-track"
    >
      <div
        className={`h-full rounded-pill ease-linear motion-reduce:transition-none ${critical ? 'bg-correction' : 'bg-action'}`}
        style={{ width: `${pct}%`, transition: 'width 1s linear' }}
      />
    </div>
  );
}

export function HudRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <div className="min-w-0 text-[13px] font-semibold text-ink-muted">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}
