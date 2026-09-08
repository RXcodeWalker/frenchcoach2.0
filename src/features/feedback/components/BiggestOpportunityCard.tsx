import { Target } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';

interface Props {
  opportunity?: string;
}

export function BiggestOpportunityCard({ opportunity }: Props) {
  if (!opportunity) return null;

  return (
    <CollapsibleCard
      title="Your One Focus"
      icon={<Target size={13} className="text-amber-400" />}
      defaultOpen={true}
      className="border border-amber-500/10"
    >
      <p className="text-[11px] text-ink-muted leading-relaxed">{opportunity}</p>
    </CollapsibleCard>
  );
}
