import { Target } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';

interface Props {
  opportunity?: string;
}

/** The Breakdown's lead card: the one thing that would most improve the next answer. */
export function BiggestOpportunityCard({ opportunity }: Props) {
  if (!opportunity) return null;
  return (
    <BreakdownCard title="Your next step" icon={Target} tone="action" emphasis subtitle="The one change that would help most next time">
      <p className="text-body-base text-ink">{opportunity}</p>
    </BreakdownCard>
  );
}
