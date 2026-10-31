import { motion } from 'framer-motion';
import { Check, HelpCircle, X } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import type { CalibrationLine, PredictionVerdict } from './predictionQuestions';

const VERDICT: Record<PredictionVerdict, { icon: typeof Check; label: string; tone: string }> = {
  right: { icon: Check, label: 'You were right', tone: 'text-progress-text' },
  wrong: { icon: X, label: 'Not quite', tone: 'text-correction-text' },
  unsure: { icon: HelpCircle, label: "Couldn't confirm", tone: 'text-reward-text' },
};

/**
 * The Full report's "Your predictions" card: one verdict per Predict check the
 * learner answered while they waited (the Coach view says the same lines as
 * talk). Nothing is shown when no check was answered.
 */
export function PredictionResults({ lines }: { lines: readonly CalibrationLine[] }) {
  if (lines.length === 0) return null;
  const right = lines.filter((l) => l.verdict === 'right').length;
  return (
    <motion.section variants={fadeUp} initial="hidden" animate="show" aria-label="Your predictions" className="rounded-xl surface p-4 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-eyebrow uppercase text-ink-subtle">Your predictions</p>
        <p className="text-[12px] text-ink-muted font-numeral">
          {right} of {lines.length} right
        </p>
      </div>
      <ul className="space-y-2">
        {lines.map((line) => {
          const v = VERDICT[line.verdict];
          const Icon = v.icon;
          return (
            <li key={line.id} className="flex items-start gap-2">
              <Icon size={14} className={`${v.tone} shrink-0 mt-0.5`} aria-label={v.label} />
              <p className="text-[12px] text-ink leading-relaxed">{line.text}</p>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
