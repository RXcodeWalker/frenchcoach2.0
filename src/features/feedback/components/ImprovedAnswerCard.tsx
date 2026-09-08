import { ArrowDown, Sparkles } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';

interface Props {
  originalTranscript: string;
  improvedAnswer?: string;
  rephrase?: string;
  formattedTranscript?: string;
}

function isSubstantiallyDifferent(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
  return normalize(a) !== normalize(b);
}

export function ImprovedAnswerCard({ originalTranscript, improvedAnswer, rephrase, formattedTranscript }: Props) {
  // Pick the best improved version — prefer improved_answer, use rephrase if distinct
  const improved = improvedAnswer ?? (rephrase && isSubstantiallyDifferent(rephrase, originalTranscript) ? rephrase : undefined);
  if (!improved) return null;

  // Show rephrase as "what changed" only if it's distinct from improved_answer
  const whatChanged = improvedAnswer && rephrase && isSubstantiallyDifferent(rephrase, improvedAnswer)
    ? rephrase
    : undefined;

  // The "your answer" display prefers formatted_transcript (cleaner), falls back to raw
  const yourAnswer = formattedTranscript || originalTranscript;

  return (
    <CollapsibleCard
      title="Your Improved Answer"
      icon={<Sparkles size={13} className="text-sky-400" />}
      defaultOpen={true}
      className="border border-sky-500/10"
    >
      <div className="space-y-2">
        {/* Original */}
        <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
          <p className="text-[8px] font-bold text-ink-subtle uppercase tracking-wider mb-1.5">Your answer</p>
          <p className="text-[10px] text-ink-muted leading-relaxed italic">{yourAnswer}</p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowDown size={14} className="text-sky-500/60" />
        </div>

        {/* Improved */}
        <div className="p-3 rounded-lg bg-sky-500/8 border border-sky-500/20">
          <p className="text-[8px] font-bold text-sky-500/70 uppercase tracking-wider mb-1.5">Improved version</p>
          <p className="text-[10px] text-sky-200 leading-relaxed font-medium">{improved}</p>
        </div>

        {/* What changed — only when rephrase adds distinct value */}
        {whatChanged && (
          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <p className="text-[8px] font-bold text-ink-subtle uppercase tracking-wider mb-1">What changed</p>
            <p className="text-[9px] text-ink-muted leading-relaxed">{whatChanged}</p>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
