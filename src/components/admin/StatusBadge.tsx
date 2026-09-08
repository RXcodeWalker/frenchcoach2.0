import type { ContentStatus } from '../../schemas/content';

const styles: Record<ContentStatus, string> = {
  draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  archived: 'bg-slate-600/20 text-ink-muted border-slate-600/40',
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status]}`}>
      {status}
    </span>
  );
}
