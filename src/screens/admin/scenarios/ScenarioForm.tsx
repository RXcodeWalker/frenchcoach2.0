import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, History, Save, Archive } from 'lucide-react';
import {
  createScenario, updateScenario, getScenario, archiveScenario,
  ConflictError, type ScenarioRecord,
} from '../../../services/content/adminApi';
import { scenarioSchema, validateScenarioGraph, type ScenarioInput, type ContentStatus } from '../../../schemas/content';
import { ArchiveConfirmDialog } from '../../../components/admin/ArchiveConfirmDialog';

const EMPTY_DATA = JSON.stringify(
  { start: { prompt: ['Bonjour !'], next: 'end' }, end: { prompt: ['Au revoir !'] } },
  null, 2,
);

export function ScenarioForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [meta, setMeta] = useState({ id: '', emoji: '', title: '', description: '', turns: 15, status: 'draft' as ContentStatus });
  const [dataText, setDataText] = useState(EMPTY_DATA);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [graphErrors, setGraphErrors] = useState<string[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'error' | 'success' | 'conflict'; msg: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    getScenario(id)
      .then((r: ScenarioRecord) => {
        setMeta({ id: r.id, emoji: r.emoji, title: r.title, description: r.description, turns: r.turns, status: r.status });
        setDataText(JSON.stringify(r.data, null, 2));
        setUpdatedAt(r.updated_at);
      })
      .catch(e => setBanner({ kind: 'error', msg: e instanceof Error ? e.message : 'Load failed' }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Live JSON parse + graph validation as the admin types.
  useEffect(() => {
    try {
      const parsed = JSON.parse(dataText);
      setJsonError(null);
      setGraphErrors(validateScenarioGraph(parsed));
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
      setGraphErrors([]);
    }
  }, [dataText]);

  async function save() {
    if (jsonError) { setBanner({ kind: 'error', msg: 'Fix the JSON syntax error.' }); return; }
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(dataText); } catch { setBanner({ kind: 'error', msg: 'Invalid JSON.' }); return; }

    const candidate: ScenarioInput = { ...meta, data: parsed as ScenarioInput['data'] };
    const result = scenarioSchema.safeParse(candidate);
    if (!result.success) {
      setBanner({ kind: 'error', msg: result.error.issues.map(i => i.message).join('; ') });
      return;
    }

    setSaving(true);
    setBanner(null);
    try {
      if (isEdit && id) await updateScenario(id, { ...result.data, expected_updated_at: updatedAt });
      else await createScenario(result.data);
      navigate('/admin/scenarios');
    } catch (e) {
      if (e instanceof ConflictError) setBanner({ kind: 'conflict', msg: e.serverMessage });
      else setBanner({ kind: 'error', msg: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-ink-muted py-10"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const inputCls = 'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none';
  const labelCls = 'block text-xs font-semibold text-ink-muted mb-1';

  return (
    <div className="max-w-3xl pb-16">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">{isEdit ? 'Edit Scenario' : 'New Scenario'}</h1>
        {isEdit && id && (
          <Link to={`/admin/scenarios/${id}/history`} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-slate-200">
            <History size={14} /> History
          </Link>
        )}
      </div>

      {banner && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
          banner.kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : banner.kind === 'conflict' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>{banner.msg}</div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1">
            <label className={labelCls}>ID</label>
            <input className={inputCls} value={meta.id} disabled={isEdit} onChange={e => setMeta(m => ({ ...m, id: e.target.value }))} />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Emoji</label>
            <input className={inputCls} value={meta.emoji} onChange={e => setMeta(m => ({ ...m, emoji: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Turns</label>
            <input className={inputCls} type="number" value={meta.turns} onChange={e => setMeta(m => ({ ...m, turns: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={meta.status} onChange={e => setMeta(m => ({ ...m, status: e.target.value as ContentStatus }))}>
              {['draft', 'published', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>State machine (JSON)</label>
          <textarea
            className={`${inputCls} font-mono text-xs`}
            rows={16}
            spellCheck={false}
            value={dataText}
            onChange={e => setDataText(e.target.value)}
          />
          {jsonError && <p className="text-xs text-red-400 mt-1">JSON error: {jsonError}</p>}
          {!jsonError && graphErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {graphErrors.map((g, i) => <li key={i} className="text-xs text-amber-400">⚠ {g}</li>)}
            </ul>
          )}
          {!jsonError && graphErrors.length === 0 && (
            <p className="text-xs text-emerald-400 mt-1">✓ Graph valid</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button onClick={save} disabled={saving || Boolean(jsonError) || graphErrors.length > 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
        <button onClick={() => navigate('/admin/scenarios')} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-slate-800">Cancel</button>
        {isEdit && meta.status !== 'archived' && (
          <button onClick={() => setArchiving(true)} className="flex items-center gap-1.5 ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-amber-300 hover:bg-amber-500/10">
            <Archive size={15} /> Archive
          </button>
        )}
      </div>

      {archiving && id && (
        <ArchiveConfirmDialog
          kind="scenarios"
          ids={[id]}
          title={`"${meta.title || id}"`}
          onCancel={() => setArchiving(false)}
          onConfirm={async () => {
            setArchiving(false);
            try { await archiveScenario(id); navigate('/admin/scenarios'); }
            catch (e) { setBanner({ kind: 'error', msg: e instanceof Error ? e.message : 'Archive failed' }); }
          }}
        />
      )}
    </div>
  );
}
