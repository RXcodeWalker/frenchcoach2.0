import { Rocket } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';

interface Props {
  advancedAnswer?: string;
}

export function AdvancedAnswerCard({ advancedAnswer }: Props) {
  if (!advancedAnswer) return null;

  return (
    <CollapsibleCard
      title="Higher-Level Version"
      icon={<Rocket size={13} className="text-purple-400" />}
      defaultOpen={false}
      className="border border-purple-500/10"
    >
      <div className="space-y-2">
        <p className="text-[9px] text-slate-600">What a top-mark response looks like for this question.</p>
        <div className="p-3 rounded-lg bg-purple-500/8 border border-purple-500/15">
          <p className="text-[10px] text-purple-200 leading-relaxed italic">{advancedAnswer}</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
