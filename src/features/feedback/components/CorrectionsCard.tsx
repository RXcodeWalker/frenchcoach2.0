import { XCircle, Sparkles } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import { IssueRow } from './IssueRow';
import { useFeedbackContext } from '../state/feedbackContext';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

interface Props {
  issues: CoachingIssue[];
  polishIssues?: CoachingIssue[];
  feedback: FeedbackV2;
  lessonsDefaultOpen?: boolean;
  /** Forces every lesson open/closed (report's "expand all" control). */
  lessonsForceOpen?: boolean;
}

export function CorrectionsCard({ issues, polishIssues = [], feedback, lessonsDefaultOpen, lessonsForceOpen }: Props) {
  const { state } = useFeedbackContext();
  const highlighted = state.highlightedCardId === 'corrections';

  // Critical: major issues that need fixing
  const criticalV2 = issues.filter(i => i.severity === 'major' || i.severity === 'minor');

  // Polish: style/refinement issues (collapsed by default)
  const polishV2 = polishIssues.filter(i =>
    i.severity === 'polish' || i.severity === 'anglicism'
  );

  // Legacy fallback when no v2 issues at all
  const legacyCritical = criticalV2.length === 0 && polishV2.length === 0
    ? (feedback.grammar?.critical ?? [])
    : [];
  const legacyPolish = criticalV2.length === 0 && polishV2.length === 0
    ? (feedback.grammar?.polish ?? [])
    : [];

  const totalCritical = criticalV2.length || legacyCritical.length;
  const totalPolish = polishV2.length || legacyPolish.length;

  if (totalCritical === 0 && totalPolish === 0) return null;

  return (
    <div className="space-y-2">
      {/* Critical section — open by default */}
      {totalCritical > 0 && (
        <CollapsibleCard
          title="Fix These First"
          icon={<XCircle size={13} className="text-red-400" />}
          badgeCount={totalCritical}
          defaultOpen={true}
          forceOpen={state.openCardIds.has('corrections') ? true : undefined}
          highlight={highlighted}
          className="border border-red-500/10"
        >
          {criticalV2.length > 0
            ? criticalV2.map(issue => (
                <IssueRow key={issue.id} issue={issue} isSelected={state.selectedIssueId === issue.id} lessonDefaultOpen={lessonsDefaultOpen} lessonForceOpen={lessonsForceOpen} />
              ))
            : legacyCritical.map((err, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 mb-1.5">
                  <p className="text-[10px] font-semibold text-red-300">{err.theme}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{err.diagnostic}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">{err.correction}</p>
                </div>
              ))
          }
        </CollapsibleCard>
      )}

      {/* Polish section — collapsed by default */}
      {totalPolish > 0 && (
        <CollapsibleCard
          title="Next Level"
          icon={<Sparkles size={13} className="text-violet-400" />}
          badgeCount={totalPolish}
          defaultOpen={false}
          className="border border-violet-500/10"
        >
          {polishV2.length > 0
            ? polishV2.map(issue => (
                <IssueRow key={issue.id} issue={issue} isSelected={state.selectedIssueId === issue.id} lessonForceOpen={lessonsForceOpen} />
              ))
            : legacyPolish.map((err, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-1.5">
                  <p className="text-[10px] font-semibold text-violet-300">{err.theme}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{err.diagnostic}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">{err.correction}</p>
                </div>
              ))
          }
        </CollapsibleCard>
      )}
    </div>
  );
}
