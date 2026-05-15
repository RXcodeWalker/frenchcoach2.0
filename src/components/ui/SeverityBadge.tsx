import type { Severity } from '../../types';

const CONFIG: Record<Severity, { label: string; className: string }> = {
  major:     { label: 'Major',     className: 'bg-red-500/15 text-red-300 border-red-500/20' },
  minor:     { label: 'Minor',     className: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  polish:    { label: 'Polish',    className: 'bg-violet-500/15 text-violet-300 border-violet-500/20' },
  anglicism: { label: 'Anglicism', className: 'bg-violet-500/15 text-violet-300 border-violet-500/20' },
  strong:    { label: 'Strong',    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
};

interface Props {
  level: Severity;
}

export function SeverityBadge({ level }: Props) {
  const { label, className } = CONFIG[level];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${className}`}>
      {label}
    </span>
  );
}
