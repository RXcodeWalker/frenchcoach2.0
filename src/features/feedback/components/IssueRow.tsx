import { ArrowRight, ChevronRight, RotateCcw, Lightbulb } from 'lucide-react';
import type { CoachingIssue } from '../../../types';
import { SeverityBadge } from '../../../components/ui/SeverityBadge';
import { SEVERITY_COLOR, SEVERITY_TEXT } from '../theme/severity';
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
    <li
      data-issue-id={issue.id}
      className={`relative overflow-hidden rounded-control border border-hairline bg-surface py-3 pl-4 pr-3 transition-shadow duration-state ${isSelected ? 'ring-2 ring-action' : ''}`}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: SEVERITY_COLOR[issue.severity] }} />
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <SeverityBadge level={issue.severity} />
        {/* themeLabel from backend — more readable than raw category */}
        {issue.themeLabel && <span className="text-caption font-semibold text-ink-muted">{issue.themeLabel}</span>}
        {issue.marksImpact > 0 && (
          <span
            className="flex items-center gap-0.5"
            aria-label={`Priority: ${issue.marksImpact} of 3`}
            title="Pedagogical priority — not a mark deduction"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-pill ${i < issue.marksImpact ? 'bg-ink-muted' : 'bg-track'}`} />
            ))}
          </span>
        )}
        {issue.isRecurring && (
          <span className="flex items-center gap-1 rounded-pill bg-reward-soft px-2 py-0.5 text-caption font-semibold text-reward-text">
            <RotateCcw size={12} aria-hidden="true" />
            Recurring
          </span>
        )}
      </div>

      <p lang="fr" className="text-body-base leading-snug">
        {issue.quote && (
          <>
            <span className={`line-through decoration-2 ${SEVERITY_TEXT[issue.severity]}`}>{issue.quote}</span>
            <ArrowRight size={14} className="mx-1.5 inline align-[-2px] text-ink-subtle" aria-label="becomes" />
          </>
        )}
        <span className="font-semibold text-progress-text">{issue.correction}</span>
      </p>

      {issue.diagnostic && <p className="mt-1 text-body-s text-ink-muted">{issue.diagnostic}</p>}

      {issue.isRecurring && issue.recurrenceNote && <p className="mt-1.5 text-body-s text-reward-text">{issue.recurrenceNote}</p>}

      {issue.stronger && (
        <div className="mt-2 flex items-start gap-1.5 text-body-s">
          <ChevronRight size={14} className="mt-0.5 shrink-0 text-action-text" aria-hidden="true" />
          <span className="text-action-text">{issue.stronger}</span>
        </div>
      )}

      {/* masterTip — single highest-leverage fix from backend */}
      {issue.masterTip && (
        <div className="mt-2 flex items-start gap-2 rounded-control bg-reward-soft px-3 py-2">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-reward-text" aria-hidden="true" />
          <p className="text-body-s text-reward-text">{issue.masterTip}</p>
        </div>
      )}

      {/* Prefer mini_lesson (new backend) over teachMe (offline legacy) */}
      <TeachMeLesson mini_lesson={issue.mini_lesson} teachMe={issue.teachMe} defaultOpen={lessonDefaultOpen} forceOpen={lessonForceOpen} command={lessonCommand} />
    </li>
  );
}
