import { CheckCircle, ChevronRight, RotateCcw, Lightbulb } from 'lucide-react';
import type { CoachingIssue } from '../../../types';
import { SeverityBadge } from '../../../components/ui/SeverityBadge';
import { SEVERITY_COLOR, SEVERITY_SOFT, SEVERITY_TEXT } from '../theme/severity';
import { TeachMeLesson } from './TeachMeLesson';

interface Props {
  issue: CoachingIssue;
  isSelected?: boolean;
  lessonDefaultOpen?: boolean;
  /** Forces the lesson open/closed (locks its toggle). */
  lessonForceOpen?: boolean;
  /** The report's "Open all / Close all lessons" command (see TeachMeLesson). */
  lessonCommand?: { open: boolean; seq: number } | null;
}

export function IssueRow({ issue, isSelected, lessonDefaultOpen, lessonForceOpen, lessonCommand }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-hairline bg-surface p-4 pl-5 ${isSelected ? 'ring-2 ring-action' : ''}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: SEVERITY_COLOR[issue.severity] }}
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SeverityBadge level={issue.severity} />
        {/* themeLabel from backend — more readable than raw category */}
        {issue.themeLabel && (
          <span className="text-xs text-ink-muted font-medium">{issue.themeLabel}</span>
        )}
        {issue.marksImpact > 0 && (
          <span
            className="flex items-center gap-0.5"
            aria-label={`Priority: ${issue.marksImpact} of 3`}
            title="Pedagogical priority — not a mark deduction"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rounded-full ${i < issue.marksImpact ? 'bg-ink-muted' : 'bg-track'}`}
              />
            ))}
          </span>
        )}
        {issue.isRecurring && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-reward-soft border border-hairline text-eyebrow text-reward-text uppercase">
            <RotateCcw size={8} />
            Recurring
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {issue.quote && (
          <div>
            <p className="text-eyebrow text-ink-subtle uppercase mb-1">You said</p>
            <p
              className={`text-base rounded-lg px-2.5 py-1.5 ${SEVERITY_TEXT[issue.severity]} ${SEVERITY_SOFT[issue.severity]}`}
            >
              {issue.quote}
            </p>
          </div>
        )}

        <div>
          <p className="text-eyebrow text-ink-subtle uppercase mb-1">Say instead</p>
          <div className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 bg-progress-soft">
            <CheckCircle size={16} className="text-progress-text flex-shrink-0 mt-1" />
            <span className="text-base text-progress-text font-medium">{issue.correction}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-ink-muted mt-3">{issue.diagnostic}</p>

      {issue.isRecurring && issue.recurrenceNote && (
        <p className="text-sm text-reward-text mt-1.5">{issue.recurrenceNote}</p>
      )}

      {issue.stronger && (
        <div className="flex items-start gap-1.5 text-sm mt-2">
          <ChevronRight size={14} className="text-action-text flex-shrink-0 mt-0.5" />
          <span className="text-action-text">{issue.stronger}</span>
        </div>
      )}

      {/* masterTip — single highest-leverage fix from backend */}
      {issue.masterTip && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-reward-soft">
          <Lightbulb size={14} className="text-reward-text flex-shrink-0 mt-0.5" />
          <p className="text-sm text-reward-text">{issue.masterTip}</p>
        </div>
      )}

      {/* Prefer mini_lesson (new backend) over teachMe (offline legacy) */}
      <TeachMeLesson mini_lesson={issue.mini_lesson} teachMe={issue.teachMe} defaultOpen={lessonDefaultOpen} forceOpen={lessonForceOpen} command={lessonCommand} />
    </div>
  );
}
