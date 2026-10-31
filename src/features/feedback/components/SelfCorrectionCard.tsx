import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import type { SelfCorrection } from '../../../domain/learn/feedback/selfCorrection';

interface Props {
  selfCorrections?: readonly SelfCorrection[];
}

/**
 * Slips the learner fixed straight away (filterCoachFeedback's
 * `selfCorrections`). They are not in the corrections list and count as no
 * mistake; this card credits the repair and says what to aim for next.
 */
export function SelfCorrectionCard({ selfCorrections }: Props) {
  if (!selfCorrections || selfCorrections.length === 0) return null;
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      aria-label="You fixed this yourself"
      className="rounded-xl bg-progress-soft border border-hairline p-4 space-y-2"
    >
      <p className="flex items-center gap-1.5 text-eyebrow uppercase text-progress-text">
        <RotateCcw size={13} aria-hidden="true" />
        You fixed {selfCorrections.length === 1 ? 'this' : 'these'} yourself
      </p>
      <ul className="space-y-1.5">
        {selfCorrections.map((s) => (
          <li key={s.quote} className="text-[12px] text-ink leading-relaxed">
            <span className="line-through decoration-correction-text text-ink-muted">« {s.quote} »</span>
            {' → '}
            <span className="font-medium text-progress-text">« {s.repair} »</span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-muted leading-relaxed">
        Catching your own slip shows you know the rule, and an examiner doesn't hold a mistake you fix at once against
        you, so it isn't in your corrections. Next step: say it right first time.
      </p>
    </motion.section>
  );
}
