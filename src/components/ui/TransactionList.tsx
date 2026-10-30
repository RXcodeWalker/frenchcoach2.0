import type { GemEvent } from '../../types/shop';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';

interface TransactionListProps {
  events: GemEvent[];
  loading: boolean;
  /** Signed out: there is no ledger to show. */
  signedOut?: boolean;
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
 * here to filter. Gains read in the progress role, spends in plain ink.
 */
export function TransactionList({ events, loading, signedOut = false }: TransactionListProps) {
  if (signedOut) {
    return <p className="py-6 text-center text-body-s text-ink-muted">Sign in to see every gem you have earned and spent.</p>;
  }
  if (loading) {
    return <p className="py-6 text-center text-body-s text-ink-muted">Loading transactions…</p>;
  }
  if (events.length === 0) {
    return <p className="py-6 text-center text-body-s text-ink-muted">No transactions yet. Gems you earn and spend will be listed here.</p>;
  }
  return (
    <ul className="divide-y divide-hairline">
      {events.map(event => (
        <li key={event.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-body-s font-semibold text-ink">{describe(event)}</p>
            <p className="text-caption text-ink-subtle">
              {new Date(event.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <span className={`font-numeral text-[15px] ${event.delta > 0 ? 'text-progress-text' : 'text-ink-muted'}`}>
            {event.delta > 0 ? '+' : ''}{event.delta.toLocaleString('en-GB')}
          </span>
        </li>
      ))}
    </ul>
  );
}
