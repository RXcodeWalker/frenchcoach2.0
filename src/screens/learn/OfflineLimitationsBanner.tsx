import { useState } from 'react';
import { X } from 'lucide-react';

export function OfflineLimitationsBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
      <span className="text-base leading-none flex-shrink-0 mt-0.5">📴</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-ink-muted">Offline analysis — limited feedback</p>
        <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
          Pronunciation scoring, semantic meaning checks, and advanced style analysis are not available without a connection. Grammar pattern detection and scoring are active.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 text-ink-subtle hover:text-ink-muted transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
