import { Mic2 } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import { scoreColor } from '../../../domain/scoring';
import type { FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
}

const SEVERITY_DOT: Record<string, string> = {
  major:   'bg-red-400',
  minor:   'bg-amber-400',
  polish:  'bg-yellow-400',
};

export function PronunciationCard({ feedback }: Props) {
  const pron = feedback.pronunciation;
  if (!pron || !pron.issues.length) return null;

  const color = scoreColor(pron.score ?? 0);

  return (
    <CollapsibleCard
      title="Pronunciation Analysis"
      icon={<Mic2 size={13} className="text-cyan-400" />}
      badgeCount={pron.issues.length}
      defaultOpen={false}
      className="border border-cyan-500/15"
    >
      {/* Score gauge */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-subtle" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3"
              stroke={color}
              strokeLinecap="round"
              strokeDasharray={`${((pron.score ?? 0) / 10) * 94.2} 94.2`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black" style={{ color }}>
            {pron.score ?? '—'}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-ink-muted">Pronunciation score</p>
          <p className="text-[9px] text-ink-muted">Based on audio analysis — focus on the items below.</p>
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {pron.issues.map((issue, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity] ?? 'bg-slate-500'}`} />
              <span className="text-[10px] font-bold text-slate-200">{issue.word}</span>
              <span className="text-[9px] text-ink-muted font-mono ml-auto">/{issue.ipaExpected}/</span>
            </div>
            <p className="text-[10px] text-ink-muted mb-1.5">{issue.problem}</p>
            {issue.drill.repeatPhrase && (
              <div className="flex items-center gap-1.5">
                <Mic2 size={9} className="text-cyan-400 shrink-0" />
                <p className="text-[9px] text-cyan-300 font-medium">
                  Drill: "{issue.drill.repeatPhrase}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
