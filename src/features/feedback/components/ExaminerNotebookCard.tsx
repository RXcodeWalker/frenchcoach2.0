import { ScrollText } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { ExaminerVerdict } from '../../../types';

const BAND_COLOR: Record<ExaminerVerdict['predictedBand'], string> = {
  'Foundation-Developing': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Foundation-Secure':     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Core-Developing':       'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Core-Secure':           'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'Extended-Mid':          'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Extended-High':         'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

interface Props {
  examiner: ExaminerVerdict;
}

export function ExaminerNotebookCard({ examiner }: Props) {
  const bandColor = BAND_COLOR[examiner.predictedBand] ?? 'bg-slate-500/15 text-ink-muted border-slate-500/30';

  return (
    <CollapsibleCard
      title="Examiner's Notebook"
      icon={<ScrollText size={13} className="text-ink-muted" />}
      defaultOpen={false}
      className="border border-slate-700/30"
    >
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] text-ink-muted italic flex-1">{examiner.oneLiner}</p>
          {examiner.predictedBand && (
            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wide shrink-0 ${bandColor}`}>
              {examiner.predictedBand}
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed italic border-t border-slate-800 pt-2">
          {examiner.notebook}
        </p>
        {examiner.examinerInsight && (
          <div className="pt-2 border-t border-slate-800">
            <p className="text-[9px] uppercase tracking-wide text-amber-400/70 font-bold mb-1">
              Examiner Insight — highest-leverage improvement
            </p>
            <p className="text-[10px] text-amber-200 font-medium not-italic">{examiner.examinerInsight}</p>
          </div>
        )}
        {examiner.marksGuidance && (
          <p className="text-[10px] text-ink-muted pt-2 border-t border-slate-800 not-italic">
            {examiner.marksGuidance}
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
}
