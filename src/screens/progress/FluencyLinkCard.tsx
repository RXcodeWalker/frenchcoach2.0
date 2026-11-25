import { motion } from 'framer-motion';
import { ChevronRight, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';

/**
 * Progress's way into the fluency trainer (fluency-trainer §2). A link only:
 * it reads nothing, so the speaking log's reader list stays one file.
 */
export function FluencyLinkCard() {
  const navigate = useNavigate();
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={() => navigate('/fluency')}
      data-testid="progress-fluency"
      className="flex items-center gap-4 rounded-card border border-hairline bg-surface p-[clamp(16px,3cqw,24px)] text-left
        transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface-recessed text-action-text" aria-hidden="true">
        <Gauge size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-section text-ink">Your speaking flow</span>
        <span className="text-body-s text-ink-muted">Speed and pauses from your spoken answers, plus the 60-45-30 s drill. Flow, not a mark.</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
    </motion.button>
  );
}
