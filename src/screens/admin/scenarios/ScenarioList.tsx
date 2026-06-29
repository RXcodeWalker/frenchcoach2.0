import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import {
  listScenarios, bulkScenarios, type ScenarioRecord, type BulkRequest,
} from '../../../services/content/adminApi';
import type { ContentStatus } from '../../../schemas/content';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { ArchiveConfirmDialog } from '../../../components/admin/ArchiveConfirmDialog';

const STATUS_FILTERS: (ContentStatus | 'all')[] = ['all', 'draft', 'published', 'archived'];

export function ScenarioList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScenarioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listScenarios(filter === 'all' ? undefined : filter));
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const selectedIds = useMemo(() => [...selected], [selected]);

  async function runBulk(body: Omit<BulkRequest, 'ids'>) {
    setBusy(true);
    try {
      await bulkScenarios({ ids: selectedIds, ...body });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">Scenarios</h1>
        <Link to="/admin/scenarios/new" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400">
          <Plus size={15} /> New
        </Link>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === s ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>{s}</button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="w-10 p-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Turns</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/50 cursor-pointer" onClick={() => navigate(`/admin/scenarios/${r.id}/edit`)}>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-400">{r.id}</td>
                  <td className="p-3">{r.emoji} {r.title}</td>
                  <td className="p-3 text-slate-400">{r.turns}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No scenarios.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl">
          <span className="text-sm font-semibold mr-2">{selected.size} selected</span>
          {busy ? <Loader2 size={16} className="animate-spin text-slate-400" /> : (
            <>
              <button onClick={() => runBulk({ action: 'publish' })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Publish</button>
              <button onClick={() => setArchiving(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Archive</button>
              <button onClick={() => runBulk({ action: 'draft' })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Draft</button>
            </>
          )}
        </div>
      )}

      {archiving && (
        <ArchiveConfirmDialog
          kind="scenarios"
          ids={selectedIds}
          title={`${selected.size} scenario${selected.size > 1 ? 's' : ''}`}
          onCancel={() => setArchiving(false)}
          onConfirm={async () => { setArchiving(false); await runBulk({ action: 'archive' }); }}
        />
      )}
    </div>
  );
}
