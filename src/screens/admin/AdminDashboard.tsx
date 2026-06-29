import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, MessagesSquare } from 'lucide-react';
import { getQuestionCounts, getScenarioCounts, type StatusCounts } from '../../services/content/adminApi';

interface CardData {
  title: string;
  icon: typeof FileQuestion;
  to: string;
  counts: StatusCounts | null;
}

function CountCard({ title, icon: Icon, to, counts }: CardData) {
  const total = counts ? counts.draft + counts.published + counts.archived : 0;
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-violet-500/40 transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Icon size={18} className="text-violet-300" />
        </div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-slate-500">{total} total</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {(['draft', 'published', 'archived'] as const).map(s => (
          <div key={s} className="rounded-lg bg-slate-800/60 py-2">
            <div className="text-lg font-black">{counts ? counts[s] : '—'}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{s}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export function AdminDashboard() {
  const [qCounts, setQCounts] = useState<StatusCounts | null>(null);
  const [sCounts, setSCounts] = useState<StatusCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getQuestionCounts(), getScenarioCounts()])
      .then(([q, s]) => { setQCounts(q); setSCounts(s); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load counts'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-black mb-1">Dashboard</h1>
      <p className="text-sm text-slate-400 mb-6">Content overview by status.</p>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <CountCard title="Questions" icon={FileQuestion} to="/admin/questions" counts={qCounts} />
        <CountCard title="Scenarios" icon={MessagesSquare} to="/admin/scenarios" counts={sCounts} />
      </div>
    </div>
  );
}
