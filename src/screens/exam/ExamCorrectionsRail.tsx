import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { ExaminerFeedbackCard } from '../../features/feedback/components/ExaminerFeedbackCard';
import type { TurnLabel } from './turnLabels';
import type { RailDisabledReason, RailEntry } from '../../services/exam/turnFeedback';

interface Props {
  coached: boolean;
  entries: RailEntry[];
  disabledReason: RailDisabledReason;
  onRetry: (turnKey: number) => void;
  highlightedTurnKey: number | null;
  /** The specific quote clicked in the transcript, within the highlighted turn. */
  highlightedQuote?: string | null;
  /** turnKey -> "Q3"/"A3" labels, matching the transcript. */
  turnLabels?: Map<number, TurnLabel>;
}

/**
 * W3's live corrections rail — a fork of LiveFeedbackPanel for exam mode:
 * same per-turn list shape, but rendering the mark-free ExaminerFeedbackCard
 * instead of the legacy FeedbackV2 card, and gated by `coached` (Exam Sim
 * shows a sealed placeholder and makes no calls at all — see turnFeedback.ts).
 */
export function ExamCorrectionsRail({ coached, entries, disabledReason, onRetry, highlightedTurnKey, highlightedQuote, turnLabels }: Props) {
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

  if (disabledReason === 'quota-exhausted') {
    return (
      <div className="rounded-card surface p-4 text-center space-y-1.5">
        <p className="text-eyebrow uppercase text-ink-subtle">Live corrections</p>
        <p className="text-body-s text-ink-muted">
          Live feedback limit reached for today. Your exam still gets its full report when you submit.
        </p>
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
                ? 'rounded-card transition-shadow duration-state ease-smooth'
                : 'rounded-card'
            }
          >
            {turnLabels?.get(entry.turnKey) && (
              <p className="px-1 pb-1 text-eyebrow uppercase text-ink-subtle">
                <span className="font-bold text-ink">Q{turnLabels.get(entry.turnKey)!.n}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-bold text-ink">A{turnLabels.get(entry.turnKey)!.n}</span>
              </p>
            )}
            <ExaminerFeedbackCard
              status={entry.status}
              result={entry.result}
              failureKind={entry.failureKind}
              onRetry={() => onRetry(entry.turnKey)}
              onSwitchToCoach={() => {}}
              hideSwitchToCoach
              variant="compact"
              highlightedQuote={highlightedTurnKey === entry.turnKey ? highlightedQuote : null}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
