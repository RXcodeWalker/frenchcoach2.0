import { Star } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  transcript?: string;
}

export function StrongestMomentCard({ feedback, transcript }: Props) {
  if ((feedback.responseTier ?? 3) <= 1) return null;

  // Prefer best_moment (new backend field), fall back to legacy span/explanation
  const bestMoment = feedback.best_moment;
  const legacyExplanation = feedback.strongestMomentExplanation;

  const span = feedback.strongestMomentSpan;
  const spanText = span && transcript && span.start < transcript.length
    ? transcript.slice(span.start, Math.min(span.end, transcript.length)).trim()
    : null;

  // Nothing to show
  if (!bestMoment && !legacyExplanation && !spanText) return null;

  return (
    <CollapsibleCard
      title="Strongest Moment"
      icon={<Star size={13} className="text-emerald-400" />}
      defaultOpen={true}
      className="border border-emerald-500/10"
    >
      {bestMoment ? (
        // New backend field — rich coaching voice
        <p className="text-[11px] text-ink-muted leading-relaxed">{bestMoment}</p>
      ) : spanText ? (
        // Legacy: span-derived quote + explanation
        <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
          <p className="text-[10px] text-emerald-300 font-medium italic">"{spanText}"</p>
          {legacyExplanation && (
            <p className="text-[10px] text-ink-muted mt-1">{legacyExplanation}</p>
          )}
        </div>
      ) : (
        // Explanation only
        <p className="text-[10px] text-ink-muted">{legacyExplanation}</p>
      )}
    </CollapsibleCard>
  );
}
