import { ArrowRight } from 'lucide-react';
import type { ExpansionLevel } from '../../../types';

export function ExpansionLevelRow({ lvl, isLast }: { lvl: ExpansionLevel; isLast: boolean }) {
  const colors = {
    1: { bg: 'bg-track', text: 'text-ink-muted', num: 'bg-track text-ink-muted' },
    2: { bg: 'bg-info-soft border border-hairline', text: 'text-info-text', num: 'bg-blue-500/20 text-info-text' },
    3: { bg: 'bg-action-soft border border-hairline', text: 'text-action-text', num: 'bg-violet-500/20 text-action-text' },
  }[lvl.level];

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg ${colors.bg}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 ${colors.num}`}>
        {lvl.level}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium font-mono break-words ${colors.text}`}>{lvl.sentence}</p>
        <p className="text-[8px] text-ink-muted mt-0.5">+ {lvl.addedWhat}</p>
      </div>
      {!isLast && <ArrowRight size={9} className="text-ink-subtle mt-1 shrink-0" />}
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
    <div className="rounded-xl surface-raised p-4 space-y-2">
      <p className="text-eyebrow text-ink-muted uppercase mb-3">{title}</p>
      <div className="space-y-2">
        {levels.map((lvl, i) => (
          <ExpansionLevelRow key={lvl.level} lvl={lvl} isLast={i === levels.length - 1} />
        ))}
      </div>
    </div>
  );
}
