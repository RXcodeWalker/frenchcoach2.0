import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { enter, enterReduced, stagger } from '../../../components/motion/variants';
import { answerFeatures } from '../teacher/answerHighlights';
import { BreakdownCard } from './BreakdownCard';

/**
 * "What your answer does": every exam move the answer really makes (a reason,
 * an opinion, the past, the future…), each with the words that show it.
 * Deterministic markers only (answerHighlights.ts); nothing found is not listed.
 */
export function AnswerFeaturesCard({ transcript }: { transcript: string }) {
  const reduced = useReducedMotion() ?? false;
  const features = answerFeatures(transcript);
  if (features.length === 0) return null;
  return (
    <BreakdownCard
      title="What your answer does"
      icon={Sparkles}
      tone="progress"
      subtitle="Things examiners listen for, found in your own words"
    >
      <motion.ul variants={stagger} initial="hidden" animate="show" className="grid gap-2 sm:grid-cols-2">
        {features.map((f) => (
          <motion.li
            key={f.label}
            variants={reduced ? enterReduced : enter}
            className="flex items-start gap-2 rounded-control surface-recessed px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-progress-soft text-progress-text" aria-hidden="true">
              <Check size={13} />
            </span>
            <span className="min-w-0">
              <span className="block text-label text-ink">{f.label}</span>
              <span lang="fr" className="block text-caption italic text-ink-muted">« {f.quote} »</span>
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </BreakdownCard>
  );
}
