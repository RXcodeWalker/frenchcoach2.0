import { motion, useReducedMotion } from 'framer-motion';
import { correct } from '../../components/motion/variants';

interface Props {
  /** What the learner typed; empty for a skipped word (then only the fix shows). */
  typed: string;
  fix: string;
  className?: string;
}

/**
 * The `correct` motion (Design System v2): the wrong form is struck through,
 * then the fix drops in and is underlined. Reduced motion shows the end state.
 */
export function CorrectionReveal({ typed, fix, className = '' }: Props) {
  const reduced = useReducedMotion();
  const still = reduced ? { initial: false as const } : {};
  const hasTyped = typed.trim().length > 0;

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 ${className}`}>
      {hasTyped && (
        <span className="relative inline-block text-correction-text">
          <span className="sr-only">You typed </span>
          {typed}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-[2px] origin-left bg-correction"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={correct.strike()}
            {...still}
          />
        </span>
      )}
      <motion.span
        className="relative inline-block font-semibold text-progress-text"
        lang="fr"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={correct.fix(hasTyped ? 0.38 : 0)}
        {...still}
      >
        <span className="sr-only">Answer: </span>
        {fix}
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-progress"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={correct.underline(hasTyped ? 0.38 : 0)}
          {...still}
        />
      </motion.span>
    </span>
  );
}
