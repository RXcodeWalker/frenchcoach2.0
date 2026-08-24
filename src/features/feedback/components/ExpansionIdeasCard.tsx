import { Lightbulb } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';

interface Props {
  ideas?: string[];
  defaultOpen?: boolean;
}

export function ExpansionIdeasCard({ ideas, defaultOpen = false }: Props) {
  if (!ideas?.length) return null;

  return (
    <CollapsibleCard
      title="How To Extend Your Answer"
      icon={<Lightbulb size={13} className="text-teal-400" />}
      badgeCount={ideas.length}
      defaultOpen={defaultOpen}
      className="border border-teal-500/10"
    >
      <div className="space-y-2">
        {ideas.map((idea, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-[8px] font-bold text-teal-400 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[10px] text-slate-300 leading-relaxed pt-0.5">{idea}</p>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
