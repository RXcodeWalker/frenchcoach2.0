import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { ExaminerFeedbackCard } from '../../features/feedback/components/ExaminerFeedbackCard';
import type { RailEntry } from '../../services/exam/turnFeedback';

interface Props {
  coached: boolean;
  entries: RailEntry[];
  disabledReason: 'signed-out' | null;
  onRetry: (turnKey: number) => void;
  highlightedTurnKey: number | null;
}

/**
 * W3's live corrections rail — a fork of LiveFeedbackPanel for exam mode:
 * same per-turn list shape, but rendering the mark-free ExaminerFeedbackCard
 * instead of the legacy FeedbackV2 card, and gated by `coached` (Exam Sim
 * shows a sealed placeholder and makes no calls at all — see turnFeedback.ts).
 */
export function ExamCorrectionsRail({ coached, entries, disabledReason, onRetry, highlightedTurnKey }: Props) {
  if (!coached) {
    return (
      <div className="rounded-card surface p-4 text-center space-y-1.5">
        <p className="text-eyebrow uppercase text-ink-subtle">Live corrections</p>
        <p className="text-body-s text-ink-muted">Sealed until you submit — this is Exam Sim.</p>
      </div>
    );
  }

  if (disabledReason === 'signed-out') {
    return (
      <div className="rounded-card surface p-4 text-center space-y-1.5">
        <p className="text-eyebrow uppercase text-ink-subtle">Live corrections</p>
        <p className="text-body-s text-ink-muted">Sign in to see examiner commentary as you go.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-card surface p-4 text-center space-y-1.5">
        <div className="flex items-center justify-center gap-1.5 text-ink-subtle">
          <GraduationCap size={14} />
          <p className="text-eyebrow uppercase">Live corrections</p>
        </div>
        <p className="text-body-s text-ink-muted">Examiner commentary will appear here after your first answer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.turnKey}
            data-turn-key={entry.turnKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={
              highlightedTurnKey === entry.turnKey
                ? 'rounded-card ring-2 ring-action transition-shadow duration-state ease-smooth'
                : 'rounded-card'
            }
          >
            <ExaminerFeedbackCard
              status={entry.status}
              result={entry.result}
              onRetry={() => onRetry(entry.turnKey)}
              onSwitchToCoach={() => {}}
              hideSwitchToCoach
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
