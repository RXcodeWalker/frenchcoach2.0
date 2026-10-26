import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import type { NextStep } from '../../features/progress/progressSummary';

/** The one recommended action on Progress — the screen's only primary button. */
export function NextStepCard({ step }: { step: NextStep }) {
  const navigate = useNavigate();
  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-next-step" className="surface rounded-card p-5 md:p-6">
      <p className="text-eyebrow uppercase text-action-text">Your next step</p>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 id="progress-next-step" className="text-subtitle text-ink">{step.title}</h2>
          <p className="mt-1 text-body-s text-ink-muted">{step.detail}</p>
        </div>
        <Button size="lg" onClick={() => navigate(step.to)} data-testid="progress-next-step-cta">
          {step.cta}
        </Button>
      </div>
    </motion.section>
  );
}
