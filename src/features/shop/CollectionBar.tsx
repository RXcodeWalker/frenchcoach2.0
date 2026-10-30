import { motion, useReducedMotion } from 'framer-motion';
import { fill } from '../../components/motion/variants';

interface Props {
  owned: number;
  total: number;
}

/** "12 of 19 collected" with a progress track — collection psychology, zero dark patterns (Shop plan §12 WOW #6). */
export function CollectionBar({ owned, total }: Props) {
  const reduced = useReducedMotion();
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="text-eyebrow uppercase text-ink-subtle">Collection</span>
        <span className="font-numeral text-[15px] text-ink" data-testid="shop-collection">
          {owned} of {total} collected
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={owned}
        aria-label="Items collected"
        className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-pill bg-track"
      >
        <motion.div
          className="h-full rounded-pill bg-progress"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={fill(0.1)}
        />
      </div>
    </div>
  );
}
