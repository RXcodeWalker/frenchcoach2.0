import { Star } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  transcript?: string;
}

export function StrongestMomentCard({ feedback, transcript }: Props) {
  const span = feedback.strongestMomentSpan;

  // Prefer slicing the actual transcript by span; fall back to deep analysis sentence
  const strongText = span && transcript && span.start < transcript.length
    ? transcript.slice(span.start, Math.min(span.end, transcript.length)).trim()
    : null;

  const stylePositives = feedback.style?.length ? null : null;

  return (
    <CollapsibleCard
      title="Strongest Moment"
      icon={<Star size={13} className="text-emerald-400" />}
      defaultOpen={false}
      className="border border-emerald-500/10"
    >
      {strongText ? (
        <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
          <p className="text-[10px] text-emerald-300 font-medium italic">"{strongText}"</p>
          <p className="text-[10px] text-slate-500 mt-1">This section demonstrates clear, natural French — keep doing this.</p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-500">
          {feedback.grammar?.polish.length === 0 && feedback.grammar?.critical.length === 0
            ? 'Your response was largely accurate — a solid foundation to build from.'
            : 'Even with errors, using complex tenses and connectors shows linguistic ambition.'}
        </p>
      )}
      {stylePositives}
    </CollapsibleCard>
  );
}
