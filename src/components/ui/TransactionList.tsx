import type { GemEvent } from '../../types/shop';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';

interface TransactionListProps {
  events: GemEvent[];
  loading: boolean;
}

const KIND_LABEL: Record<GemEvent['kind'], string> = {
  earn: 'Practice',
  purchase: 'Purchase',
  spend: 'Spend',
  refund: 'Refund',
  grant: 'Starting balance',
};

function describe(event: GemEvent): string {
  const itemName = event.itemId ? SHOP_CATALOGUE[event.itemId]?.name ?? event.itemId : null;
  if (event.kind === 'spend' && itemName) return `Bought ${itemName}`;
  if (event.kind === 'refund' && itemName) return `Refund — ${itemName}`;
  return KIND_LABEL[event.kind];
}

/**
 * Full gem ledger — an audit trail and a trust signal (Shop plan §12 WOW #8,
 * §14.8). Exposes only kind/delta/resolved item name/created_at; never the
 * metadata jsonb, idempotency key, or cap state. Replays are invisible by
 * construction — a replayed RPC call writes no new row, so there is nothing
 * here to filter.
 */
export function TransactionList({ events, loading }: TransactionListProps) {
  if (loading) {
    return <p className="text-xs text-slate-500 font-bold text-center py-6">Loading transactions…</p>;
  }
  if (events.length === 0) {
    return <p className="text-xs text-slate-500 font-bold text-center py-6">No transactions yet.</p>;
  }
  return (
    <div className="divide-y divide-white/5">
      {events.map(event => (
        <div key={event.id} className="flex items-center justify-between py-2.5">
          <div>
            <p className="text-xs font-bold text-white">{describe(event)}</p>
            <p className="text-[10px] text-slate-500">
              {new Date(event.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <span className={`text-sm font-black ${event.delta > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {event.delta > 0 ? '+' : ''}{event.delta.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
