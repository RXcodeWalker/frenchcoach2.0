import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

/** A small stat tile (Design System v2): role-coloured icon, 28px tabular value, 13px label. */
export function StatTile({ icon, value, label, className = '' }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface p-4 ${className}`}>
      <div className="flex">{icon}</div>
      <p className="mt-1.5 font-numeral text-num-m text-ink">{value}</p>
      <p className="text-[13px] font-normal text-ink-subtle">{label}</p>
    </div>
  );
}
