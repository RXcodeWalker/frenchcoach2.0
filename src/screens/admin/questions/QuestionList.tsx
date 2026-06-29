import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import {
  listQuestions, bulkQuestions, type QuestionRecord, type BulkRequest,
} from '../../../services/content/adminApi';
import { TOPICS } from '../../../data/questions';
import type { ContentStatus } from '../../../schemas/content';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { ArchiveConfirmDialog } from '../../../components/admin/ArchiveConfirmDialog';

const STATUS_FILTERS: (ContentStatus | 'all')[] = ['all', 'draft', 'published', 'archived'];

export function QuestionList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [popover, setPopover] = useState<'topic' | 'difficulty' | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listQuestions(filter === 'all' ? undefined : filter));
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
    setPopover(null);
    try {
      await bulkQuestions({ ids: selectedIds, ...body });
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
        <h1 className="text-2xl font-black">Questions</h1>
        <Link to="/admin/questions/new" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400">
          <Plus size={15} /> New
        </Link>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
              filter === s ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}
          </button>
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
                <th className="text-left p-3">Text</th>
                <th className="text-left p-3">Topic</th>
                <th className="text-left p-3">Diff</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/50 cursor-pointer" onClick={() => navigate(`/admin/questions/${r.id}/edit`)}>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-400">{r.id}</td>
                  <td className="p-3 max-w-md truncate">{r.text}</td>
                  <td className="p-3 text-slate-400">{r.topic_key}</td>
                  <td className="p-3 text-slate-400">{r.difficulty}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No questions.</td></tr>
              )}
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
              <div className="relative">
                <button onClick={() => setPopover(popover === 'topic' ? null : 'topic')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Reassign Topic</button>
                {popover === 'topic' && (
                  <div className="absolute bottom-full mb-2 left-0 w-48 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-1">
                    {TOPICS.map(t => (
                      <button key={t.key} onClick={() => runBulk({ action: 'reassign_topic', topic_key: t.key })} className="block w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-700">{t.labelEn}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setPopover(popover === 'difficulty' ? null : 'difficulty')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Set Difficulty</button>
                {popover === 'difficulty' && (
                  <div className="absolute bottom-full mb-2 left-0 rounded-lg border border-slate-700 bg-slate-800 p-1">
                    {[1, 2, 3].map(d => (
                      <button key={d} onClick={() => runBulk({ action: 'set_difficulty', difficulty: d as 1 | 2 | 3 })} className="block w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-700">Level {d}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {archiving && (
        <ArchiveConfirmDialog
          kind="questions"
          ids={selectedIds}
          title={`${selected.size} question${selected.size > 1 ? 's' : ''}`}
          onCancel={() => setArchiving(false)}
          onConfirm={async () => { setArchiving(false); await runBulk({ action: 'archive' }); }}
        />
      )}
    </div>
  );
}
