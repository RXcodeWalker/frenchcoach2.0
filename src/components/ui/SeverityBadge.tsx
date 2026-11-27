import type { Severity } from '../../types';

/** Role tokens only, so the badge reads at AA in both themes. */
const CONFIG: Record<Severity, { label: string; className: string }> = {
  major:     { label: 'Major',     className: 'bg-correction-soft text-correction-text' },
  minor:     { label: 'Minor',     className: 'bg-reward-soft text-reward-text' },
  polish:    { label: 'Polish',    className: 'bg-action-soft text-action-text' },
  anglicism: { label: 'Anglicism', className: 'bg-action-soft text-action-text' },
  strong:    { label: 'Strong',    className: 'bg-progress-soft text-progress-text' },
};

interface Props {
  level: Severity;
}

export function SeverityBadge({ level }: Props) {
  const { label, className } = CONFIG[level];
  return (
    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-semibold ${className}`}>
      {label}
    </span>
  );
}
