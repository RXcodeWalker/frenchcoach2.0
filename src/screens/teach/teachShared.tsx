import type { ReactNode } from 'react';

/** A number with what it is, and how much evidence is behind it. */
export function Metric({ value, label, note }: { value: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-surface px-4 py-3">
      <div className="font-numeral text-num-m text-ink tabular-nums">{value}</div>
      <div className="text-label text-ink mt-1">{label}</div>
      {note && <div className="text-caption text-ink-subtle mt-0.5">{note}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-hairline-strong bg-surface-recessed px-5 py-6 text-center">
      <p className="text-label text-ink">{title}</p>
      {children && <div className="text-body-s text-ink-muted mt-1">{children}</div>}
    </div>
  );
}

