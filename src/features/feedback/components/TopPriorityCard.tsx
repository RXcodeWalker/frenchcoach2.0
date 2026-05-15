import { AlertTriangle } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import { IssueRow } from './IssueRow';
import { useFeedbackContext } from '../state/feedbackContext';
import type { CoachingIssue } from '../../../types';

interface Props {
  issue: CoachingIssue;
  isSelected: boolean;
}

export function TopPriorityCard({ issue, isSelected }: Props) {
  const { state } = useFeedbackContext();
  const highlighted = state.highlightedCardId === 'top-priority';
  const forceOpen = state.openCardIds.has('top-priority') ? true : undefined;

  return (
    <CollapsibleCard
      title="Top Priority"
      icon={<AlertTriangle size={13} className="text-red-400" />}
      defaultOpen={true}
      forceOpen={forceOpen}
      highlight={highlighted}
      className="border border-red-500/15"
    >
      <p className="text-[9px] text-slate-600 mb-2">
        This correction will have the biggest impact on your mark.
      </p>
      <IssueRow issue={issue} isSelected={isSelected} />
    </CollapsibleCard>
  );
}
