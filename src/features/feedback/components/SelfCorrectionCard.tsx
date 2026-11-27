import { Undo2 } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';
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
    <BreakdownCard
      title="You fixed this yourself"
      icon={Undo2}
      tone="info"
      count={selfCorrections.length > 1 ? selfCorrections.length : undefined}
      subtitle="Not counted as a mistake"
      section="self"
    >
      <ul className="space-y-1.5">
        {selfCorrections.map((s) => (
          <li key={s.quote} lang="fr" className="text-body-s text-ink">
            <span className="text-ink-muted line-through decoration-correction-text">« {s.quote} »</span>
            {' → '}
            <span className="font-semibold text-progress-text">« {s.repair} »</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-body-s text-ink-muted">
        Catching your own slip shows you know the rule, and an examiner doesn't hold a mistake you fix at once against
        you, so it isn't in your corrections. Next step: say it right first time.
      </p>
    </BreakdownCard>
  );
}
