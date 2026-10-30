import { motion, useReducedMotion } from 'framer-motion';
import { fill } from '../../components/motion/variants';

interface Props {
  ratio: number;
  label: string;
}

/**
 * Live progress toward an item's requirement (Shop plan §15 Phase 5). A locked
 * item advertises *learning*, so this reads real mastery/streak/XP and fills
 * with the `fill` motion — progress role, no gradient.
 */
export function RequirementBar({ ratio, label }: Props) {
  const reduced = useReducedMotion();
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-pill bg-track"
      >
        <motion.div
          className="h-full rounded-pill bg-progress"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={fill(0.1)}
        />
      </div>
      <p className="mt-1.5 text-caption text-ink-muted">{label}</p>
    </div>
  );
}
