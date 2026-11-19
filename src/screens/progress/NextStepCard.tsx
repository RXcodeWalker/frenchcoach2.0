import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, GraduationCap, Mic, RotateCcw, Target, Wrench } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import type { CoachMove, CoachMoveKind } from '../../services/coach/coachBrain';

const ICON: Record<CoachMoveKind, typeof Mic> = {
  first_steps: Mic,
  fix_mistake: Wrench,
  exam_sim: GraduationCap,
  role_play: GraduationCap,
  two_part_answers: BookOpen,
  coached_exam: GraduationCap,
  develop_answers: BookOpen,
  weak_skill: Target,
  review: RotateCcw,
  new_topic: Compass,
  keep_going: BookOpen,
};

/** The coach's move (the same decision as Home's) — the screen's only primary button (frame 3a). */
export function NextStepCard({ move }: { move: CoachMove }) {
  const navigate = useNavigate();
  const Icon = ICON[move.kind] ?? BookOpen;
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
        <h2 id="progress-next-step" className="text-title text-ink">{move.title}</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">{move.why}</p>
      </div>
      <Button size="lg" onClick={() => navigate(move.to)} data-testid="progress-next-step-cta">
        {move.cta}<ArrowRight size={16} aria-hidden="true" />
      </Button>
    </motion.section>
  );
}
