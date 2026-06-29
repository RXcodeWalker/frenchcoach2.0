import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, RotateCcw } from 'lucide-react';
import {
  listVersions, previewVersion, restoreVersion, ConflictError,
  type VersionMeta, type VersionPreview,
} from '../../services/content/adminApi';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Shared version history + diff-preview + restore. `kind` chosen by the route. */
export function VersionHistory({ kind }: { kind: 'questions' | 'scenarios' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VersionPreview | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!id) return;
    listVersions(kind, id)
      .then(r => setVersions(r.versions))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load versions'))
      .finally(() => setLoading(false));
  }, [kind, id]);

  async function openPreview(v: number) {
    if (!id) return;
    try { setPreview(await previewVersion(kind, id, v)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Preview failed'); }
  }

  async function confirmRestore() {
    if (!id || !preview) return;
    setRestoring(true);
    try {
      await restoreVersion(kind, id, preview.version, (preview.current as { updated_at?: string }).updated_at);
      setPreview(null);
      navigate(`/admin/${kind}/${id}/edit`);
    } catch (e) {
      setError(e instanceof ConflictError ? e.serverMessage : e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="max-w-3xl pb-16">
      <h1 className="text-2xl font-black mb-1">Version History</h1>
      <p className="text-sm text-slate-400 mb-6 font-mono">{id}</p>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-slate-500 py-6">No prior versions — this record hasn't been edited yet.</p>
      ) : (
        <ul className="space-y-2">
          {versions.map(v => (
            <li key={v.version_number} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div>
                <span className="font-bold">v{v.version_number}</span>
                <span className="text-xs text-slate-500 ml-3">{new Date(v.created_at).toLocaleString()}</span>
              </div>
              <button onClick={() => openPreview(v.version_number)} className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                Preview restore
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="font-bold text-lg mb-1">Restore to v{preview.version}?</h2>
            <p className="text-sm text-slate-400 mb-4">{preview.diff.length} field(s) will change.</p>
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                  <tr><th className="text-left p-2">Field</th><th className="text-left p-2">Current</th><th className="text-left p-2">Target (v{preview.version})</th></tr>
                </thead>
                <tbody>
                  {preview.diff.map(d => (
                    <tr key={d.field} className="border-t border-slate-800 bg-amber-500/5">
                      <td className="p-2 font-mono text-xs">{d.field}</td>
                      <td className="p-2 text-slate-400 max-w-[200px] truncate">{fmt(d.from)}</td>
                      <td className="p-2 text-amber-300 max-w-[200px] truncate">{fmt(d.to)}</td>
                    </tr>
                  ))}
                  {preview.diff.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No differences.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={confirmRestore} disabled={restoring || preview.diff.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50">
                {restoring ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Confirm restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
