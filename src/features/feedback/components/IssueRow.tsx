import { CheckCircle, ChevronRight, RotateCcw, Lightbulb } from 'lucide-react';
import type { CoachingIssue } from '../../../types';
import { SeverityBadge } from '../../../components/ui/SeverityBadge';
import { SEVERITY_BG, SEVERITY_COLOR } from '../theme/severity';
import { TeachMeLesson } from './TeachMeLesson';

interface Props {
  issue: CoachingIssue;
  isSelected?: boolean;
  lessonDefaultOpen?: boolean;
  /** Forces every lesson open/closed (report's "expand all" control). */
  lessonForceOpen?: boolean;
}

export function IssueRow({ issue, isSelected, lessonDefaultOpen, lessonForceOpen }: Props) {
  const bg = SEVERITY_BG[issue.severity] ?? '';
  return (
    <div className={`rounded-lg border p-3 ${bg} ${isSelected ? 'ring-1 ring-violet-400/40' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <SeverityBadge level={issue.severity} />
        {/* themeLabel from backend — more readable than raw category */}
        {issue.themeLabel && (
          <span className="text-[9px] text-ink-muted font-medium">{issue.themeLabel}</span>
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
                className={`w-1 h-1 rounded-full ${i < issue.marksImpact ? 'bg-slate-500' : 'bg-slate-800'}`}
              />
            ))}
          </span>
        )}
        {issue.isRecurring && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[8px] font-bold text-amber-400 uppercase tracking-wide">
            <RotateCcw size={8} />
            Recurring
          </span>
        )}
      </div>

      {issue.quote && (
        <p
          className="text-[10px] font-mono mb-1.5 px-1.5 py-0.5 rounded inline-block"
          style={{ color: SEVERITY_COLOR[issue.severity], background: `${SEVERITY_COLOR[issue.severity]}12` }}
        >
          "{issue.quote}"
        </p>
      )}

      <p className="text-[10px] text-ink-muted mb-1.5">{issue.diagnostic}</p>

      {issue.isRecurring && issue.recurrenceNote && (
        <p className="text-[9px] text-amber-500/80 italic mb-1.5">{issue.recurrenceNote}</p>
      )}

      <div className="flex items-start gap-1.5 text-[10px] mb-1">
        <CheckCircle size={10} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <span className="text-emerald-300 font-medium">{issue.correction}</span>
      </div>

      {issue.stronger && (
        <div className="flex items-start gap-1.5 text-[10px] mb-1">
          <ChevronRight size={10} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <span className="text-violet-300">{issue.stronger}</span>
        </div>
      )}

      {/* masterTip — single highest-leverage fix from backend */}
      {issue.masterTip && (
        <div className="flex items-start gap-1.5 mt-1.5 p-2 rounded-md bg-amber-500/8 border border-amber-500/15">
          <Lightbulb size={9} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-amber-300">{issue.masterTip}</p>
        </div>
      )}

      {/* Prefer mini_lesson (new backend) over teachMe (offline legacy) */}
      <TeachMeLesson mini_lesson={issue.mini_lesson} teachMe={issue.teachMe} defaultOpen={lessonDefaultOpen} forceOpen={lessonForceOpen} />
    </div>
  );
}
