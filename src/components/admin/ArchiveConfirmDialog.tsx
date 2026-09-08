import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getReferences, type Reference } from '../../services/content/adminApi';

interface Props {
  kind: 'questions' | 'scenarios';
  ids: string[];
  title: string; // human label for the item(s) being archived
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reference-aware archive confirmation. Fetches references for all target ids;
 * if any exist, lists them before allowing "Archive anyway".
 */
export function ArchiveConfirmDialog({ kind, ids, title, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState<Reference[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(ids.map(id => getReferences(kind, id).catch(() => ({ id, references: [] }))))
      .then(results => {
        if (cancelled) return;
        const all: Reference[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          for (const ref of r.references) {
            const key = `${ref.type}:${ref.id}`;
            if (!seen.has(key)) { seen.add(key); all.push(ref); }
          }
        }
        setRefs(all);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [kind, ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Archive {title}?</h2>
            <p className="text-sm text-ink-muted">Archiving hides content from learners. It can be restored later.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted py-6">
            <Loader2 size={16} className="animate-spin" /> Checking references…
          </div>
        ) : refs.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm font-semibold text-ink-muted mb-2">This is referenced by:</p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {refs.map(r => (
                <li key={`${r.type}:${r.id}`} className="text-sm text-ink-muted flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-800 text-ink-muted">{r.type}</span>
                  {r.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted mt-3">
              References are not auto-removed — exam sets keep the item listed until edited manually.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted py-2 mb-2">No references found.</p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/90 text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            Archive anyway
          </button>
        </div>
      </div>
    </div>
  );
}
