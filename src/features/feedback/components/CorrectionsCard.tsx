import { XCircle } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import { IssueRow } from './IssueRow';
import { useFeedbackContext } from '../state/feedbackContext';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

interface Props {
  issues: CoachingIssue[];
  feedback: FeedbackV2;
  topPriorityId?: string;
}

export function CorrectionsCard({ issues, feedback, topPriorityId }: Props) {
  const { state } = useFeedbackContext();
  const highlighted = state.highlightedCardId === 'corrections';

  // Show v2 issues if available; fall back to legacy grammar errors
  const v2Issues = issues.filter(i => i.id !== topPriorityId && (i.severity === 'major' || i.severity === 'minor'));

  const legacyErrors = v2Issues.length === 0
    ? [...(feedback.grammar?.critical ?? []), ...(feedback.grammar?.polish ?? [])]
    : [];

  const totalCount = v2Issues.length || legacyErrors.length;
  if (totalCount === 0) return null;

  return (
    <CollapsibleCard
      title="Corrections"
      icon={<XCircle size={13} className="text-red-400" />}
      badgeCount={totalCount}
      defaultOpen={false}
      forceOpen={state.openCardIds.has('corrections') ? true : undefined}
      highlight={highlighted}
    >
      {v2Issues.length > 0
        ? v2Issues.map(issue => (
            <IssueRow key={issue.id} issue={issue} isSelected={state.selectedIssueId === issue.id} />
          ))
        : legacyErrors.map((err, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 mb-1.5">
              <p className="text-[10px] font-semibold text-red-300">{err.theme}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{err.diagnostic}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">{err.correction}</p>
            </div>
          ))
      }
    </CollapsibleCard>
  );
}
