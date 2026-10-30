import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fill } from '../../components/motion/variants';
import { PRACTICE_PASS_SCORE } from '../../domain/pronunciation/practiceThresholds';

/** Pieces shared by the Drills and Shadowing panels (Design System v2). */

export function DifficultyPill({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const cls =
    difficulty === 'easy'
      ? 'bg-progress-soft text-progress-text'
      : difficulty === 'medium'
        ? 'bg-reward-soft text-reward-text'
        : 'bg-correction-soft text-correction-text';
  return <span className={`rounded-pill px-2 py-0.5 text-caption font-semibold capitalize ${cls}`}>{difficulty}</span>;
}

export function StateNotice({
  icon,
  title,
  tone = 'warn',
  onRetry,
  children,
}: {
  icon: ReactNode;
  title: string;
  tone?: 'warn' | 'error';
  onRetry: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 text-center">
      <span
        aria-hidden="true"
        className={`flex h-14 w-14 items-center justify-center rounded-pill ${
          tone === 'error' ? 'bg-correction-soft text-correction-text' : 'bg-reward-soft text-reward-text'
        }`}
      >
        {icon}
      </span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-[13px] text-ink-muted">{children}</p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCcw size={16} aria-hidden="true" /> Try again
      </Button>
    </motion.div>
  );
}

const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R;

export function ScoreRing({ score, reduced }: { score: number; reduced: boolean }) {
  const colour = score >= PRACTICE_PASS_SCORE ? 'var(--progress)' : score >= 50 ? 'var(--reward)' : 'var(--correction)';
  const offset = RING_C - (RING_C * Math.max(0, Math.min(100, score))) / 100;
  return (
    <div className="relative flex h-24 w-24 items-center justify-center" role="img" aria-label={`Score ${Math.round(score)} out of 100`}>
      <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="48" cy="48" r={RING_R} fill="none" stroke="var(--track)" strokeWidth="8" />
        <motion.circle
          cx="48"
          cy="48"
          r={RING_R}
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          initial={{ strokeDashoffset: reduced ? offset : RING_C }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : fill(0.1)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numeral text-[28px] leading-none text-ink">{Math.round(score)}</span>
        <span className="mt-0.5 text-caption text-ink-subtle">Score</span>
      </div>
    </div>
  );
}

export function SubScore({ label, value, reduced }: { label: string; value: number; reduced: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-numeral text-ink">{Math.round(value)}%</span>
      </div>
      <span className="block h-2 overflow-hidden rounded-pill bg-track">
        <motion.span
          className="block h-full rounded-pill bg-progress"
          initial={{ width: reduced ? `${pct}%` : 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : fill(0.3)}
        />
      </span>
    </div>
  );
}
