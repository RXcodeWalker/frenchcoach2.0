import { ArrowRight } from 'lucide-react';
import type { ExpansionLevel } from '../../../types';

export function ExpansionLevelRow({ lvl, isLast }: { lvl: ExpansionLevel; isLast: boolean }) {
  const colors = {
    1: { bg: 'bg-slate-700/60', text: 'text-slate-300', num: 'bg-slate-600/80 text-slate-400' },
    2: { bg: 'bg-blue-500/8 border border-blue-500/15', text: 'text-blue-300', num: 'bg-blue-500/20 text-blue-400' },
    3: { bg: 'bg-violet-500/8 border border-violet-500/15', text: 'text-violet-300', num: 'bg-violet-500/20 text-violet-400' },
  }[lvl.level];

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg ${colors.bg}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 ${colors.num}`}>
        {lvl.level}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium font-mono break-words ${colors.text}`}>{lvl.sentence}</p>
        <p className="text-[8px] text-slate-500 mt-0.5">+ {lvl.addedWhat}</p>
      </div>
      {!isLast && <ArrowRight size={9} className="text-slate-600 mt-1 shrink-0" />}
    </div>
  );
}

interface Props {
  levels: ExpansionLevel[];
  title: string;
}

export function RewriteLadder({ levels, title }: Props) {
  if (levels.length === 0) return null;
  return (
    <div className="rounded-xl glass-elevated p-4 space-y-2">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-3">{title}</p>
      <div className="space-y-2">
        {levels.map((lvl, i) => (
          <ExpansionLevelRow key={lvl.level} lvl={lvl} isLast={i === levels.length - 1} />
        ))}
      </div>
    </div>
  );
}
