import { useEffect, useState } from 'react';
import { Plus, Loader2, Copy, Check, Ban } from 'lucide-react';
import {
  listInviteCodes, createInviteCodes, revokeInviteCode, type InviteCodeRecord,
} from '../../services/content/adminApi';

/** Phase 3 — admin invite-code issuance/list/revoke screen (§1e). */
export function InviteCodeList() {
  const [rows, setRows] = useState<InviteCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [count, setCount] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { codes } = await listInviteCodes();
      setRows(codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createInviteCodes({ count, max_uses: maxUses, note: note.trim() || undefined });
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create codes');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(code: string) {
    setBusy(true);
    setError(null);
    try {
      await revokeInviteCode(code);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke');
    } finally {
      setBusy(false);
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function isExpired(row: InviteCodeRecord): boolean {
    return row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now();
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">Invite codes</h1>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="block text-[11px] text-ink-muted mb-1">How many</label>
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg bg-slate-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink-muted mb-1">Uses per code</label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg bg-slate-800 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] text-ink-muted mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. beta cohort 1"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Generate
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-muted" /></div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Uses</th>
                <th className="px-4 py-2.5">Note</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const revoked = isExpired(row);
                const exhausted = row.use_count >= row.max_uses;
                return (
                  <tr key={row.code} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs flex items-center gap-2">
                      {row.code}
                      <button onClick={() => copyCode(row.code)} className="text-ink-muted hover:text-white">
                        {copied === row.code ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">{row.use_count} / {row.max_uses}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{row.note ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      {revoked ? (
                        <span className="text-red-400">Revoked</span>
                      ) : exhausted ? (
                        <span className="text-ink-muted">Exhausted</span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!revoked && (
                        <button
                          onClick={() => void handleRevoke(row.code)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
                        >
                          <Ban size={13} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No invite codes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
