import { Layers } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { FeedbackV2, CoachingIssue } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  polishIssues: CoachingIssue[];
}

export function StyleStructureCard({ feedback, polishIssues }: Props) {
  const legacyStyle = feedback.style ?? [];
  const hasContent = polishIssues.length > 0 || legacyStyle.length > 0;
  if (!hasContent) return null;

  return (
    <CollapsibleCard
      title="Style & Structure"
      icon={<Layers size={13} className="text-violet-400" />}
      badgeCount={polishIssues.length || legacyStyle.length}
      defaultOpen={false}
    >
      {polishIssues.length > 0 ? (
        <div className="space-y-2">
          {polishIssues.map(issue => (
            <div key={issue.id} className="p-2.5 rounded-lg bg-violet-500/8 border border-violet-500/15">
              <p className="text-[10px] text-ink-muted mb-1">{issue.diagnostic}</p>
              {issue.stronger && (
                <p className="text-[10px] text-violet-300 font-medium">Try: {issue.stronger}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {legacyStyle.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg glass-subtle">
              <span className="text-[10px] font-semibold text-violet-300 flex-shrink-0">{s.label}</span>
              <span className="text-[10px] text-ink-muted">{s.suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
