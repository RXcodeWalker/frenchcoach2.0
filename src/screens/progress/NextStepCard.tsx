import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, GraduationCap, Mic, RotateCcw, Target } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import type { NextStep, NextStepKind } from '../../features/progress/progressSummary';

const ICON: Record<NextStepKind, typeof Mic> = {
  'first-session': Mic,
  'review-due': RotateCcw,
  'exam-sim': GraduationCap,
  'weakest-topic': Target,
  'new-topic': Compass,
};

/** The one recommended action on Progress — the screen's only primary button (frame 3a). */
export function NextStepCard({ step }: { step: NextStep }) {
  const navigate = useNavigate();
  const Icon = ICON[step.kind] ?? BookOpen;
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="progress-next-step"
      className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,28px)]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
        <p className="text-eyebrow uppercase text-action-text">Your next step</p>
        <h2 id="progress-next-step" className="text-title text-ink">{step.title}</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">{step.detail}</p>
      </div>
      <Button size="lg" onClick={() => navigate(step.to)} data-testid="progress-next-step-cta">
        {step.cta}<ArrowRight size={16} aria-hidden="true" />
      </Button>
    </motion.section>
  );
}
