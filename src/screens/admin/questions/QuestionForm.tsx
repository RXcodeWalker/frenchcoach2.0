import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, History, Save, Archive } from 'lucide-react';
import {
  createQuestion, updateQuestion, getQuestion, archiveQuestion,
  ConflictError, type QuestionRecord,
} from '../../../services/content/adminApi';
import { questionSchema, type QuestionInput, type ContentStatus } from '../../../schemas/content';
import { TOPICS } from '../../../data/questions';
import { ArchiveConfirmDialog } from '../../../components/admin/ArchiveConfirmDialog';

const EMPTY: QuestionInput = {
  id: '', topic_key: TOPICS[0]?.key ?? '', text: '', hint: '',
  difficulty: 1, follow_ups: [], model_answer: '', key_vocab: [],
  is_past_paper: false, year: undefined, paper_code: undefined, status: 'draft',
};

export function QuestionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<QuestionInput>(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ kind: 'error' | 'success' | 'conflict'; msg: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    getQuestion(id)
      .then((r: QuestionRecord) => {
        setForm({
          id: r.id, topic_key: r.topic_key, text: r.text, hint: r.hint ?? '',
          difficulty: r.difficulty, follow_ups: r.follow_ups ?? [],
          model_answer: r.model_answer ?? '', key_vocab: r.key_vocab ?? [],
          is_past_paper: r.is_past_paper ?? false, year: r.year ?? undefined,
          paper_code: r.paper_code ?? undefined, status: r.status,
        });
        setUpdatedAt(r.updated_at);
      })
      .catch(e => setBanner({ kind: 'error', msg: e instanceof Error ? e.message : 'Load failed' }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set<K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function validate(): QuestionInput | null {
    const result = questionSchema.safeParse(form);
    if (result.success) { setErrors({}); return result.data; }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'form';
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    setErrors(fieldErrors);
    return null;
  }

  async function save() {
    const valid = validate();
    if (!valid) { setBanner({ kind: 'error', msg: 'Fix validation errors above.' }); return; }
    setSaving(true);
    setBanner(null);
    try {
      if (isEdit && id) {
        await updateQuestion(id, { ...valid, expected_updated_at: updatedAt });
      } else {
        await createQuestion(valid);
      }
      setBanner({ kind: 'success', msg: 'Saved.' });
      navigate('/admin/questions');
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
    <div className="max-w-2xl pb-16">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">{isEdit ? 'Edit Question' : 'New Question'}</h1>
        {isEdit && id && (
          <Link to={`/admin/questions/${id}/history`} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-slate-200">
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
        <div>
          <label className={labelCls}>ID</label>
          <input className={inputCls} value={form.id} disabled={isEdit} onChange={e => set('id', e.target.value)} />
          {errors.id && <p className="text-xs text-red-400 mt-1">{errors.id}</p>}
        </div>
        <div>
          <label className={labelCls}>Question text</label>
          <textarea className={inputCls} rows={2} value={form.text} onChange={e => set('text', e.target.value)} />
          {errors.text && <p className="text-xs text-red-400 mt-1">{errors.text}</p>}
        </div>
        <div>
          <label className={labelCls}>Hint</label>
          <input className={inputCls} value={form.hint} onChange={e => set('hint', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Topic</label>
            <select className={inputCls} value={form.topic_key} onChange={e => set('topic_key', e.target.value)}>
              {TOPICS.map(t => <option key={t.key} value={t.key}>{t.labelEn}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Difficulty</label>
            <select className={inputCls} value={form.difficulty} onChange={e => set('difficulty', Number(e.target.value) as 1 | 2 | 3)}>
              {[1, 2, 3].map(d => <option key={d} value={d}>Level {d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Follow-ups (one per line)</label>
          <textarea className={inputCls} rows={3} value={form.follow_ups.join('\n')} onChange={e => set('follow_ups', e.target.value.split('\n').filter(Boolean))} />
        </div>
        <div>
          <label className={labelCls}>Model answer</label>
          <textarea className={inputCls} rows={4} value={form.model_answer} onChange={e => set('model_answer', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Key vocab (fr=en, one per line)</label>
          <textarea
            className={inputCls}
            rows={4}
            value={form.key_vocab.map(v => `${v.fr}=${v.en}`).join('\n')}
            onChange={e => set('key_vocab', e.target.value.split('\n').filter(Boolean).map(line => {
              const [fr, ...rest] = line.split('=');
              return { fr: fr.trim(), en: rest.join('=').trim() };
            }))}
          />
          {errors['key_vocab'] && <p className="text-xs text-red-400 mt-1">{errors['key_vocab']}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value as ContentStatus)}>
              {['draft', 'published', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input className={inputCls} type="number" value={form.year ?? ''} onChange={e => set('year', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className={labelCls}>Paper code</label>
            <input className={inputCls} value={form.paper_code ?? ''} onChange={e => set('paper_code', e.target.value || undefined)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={form.is_past_paper} onChange={e => set('is_past_paper', e.target.checked)} />
          Past paper question
        </label>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
        <button onClick={() => navigate('/admin/questions')} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-slate-800">Cancel</button>
        {isEdit && form.status !== 'archived' && (
          <button onClick={() => setArchiving(true)} className="flex items-center gap-1.5 ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-amber-300 hover:bg-amber-500/10">
            <Archive size={15} /> Archive
          </button>
        )}
      </div>

      {archiving && id && (
        <ArchiveConfirmDialog
          kind="questions"
          ids={[id]}
          title={`"${form.text || id}"`}
          onCancel={() => setArchiving(false)}
          onConfirm={async () => {
            setArchiving(false);
            try { await archiveQuestion(id); navigate('/admin/questions'); }
            catch (e) { setBanner({ kind: 'error', msg: e instanceof Error ? e.message : 'Archive failed' }); }
          }}
        />
      )}
    </div>
  );
}
