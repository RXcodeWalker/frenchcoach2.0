import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  /**
   * True when the offline evaluator ran because no one is signed in (AI
   * scoring is account-gated since Phase 3), not because the network failed.
   * Telling a guest with full connectivity that they're offline sends them to
   * debug their wifi instead of signing in.
   */
  signedOut?: boolean;
}

export function OfflineLimitationsBanner({ signedOut = false }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  if (signedOut) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
        <span className="text-base leading-none flex-shrink-0 mt-0.5">🔒</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-muted">Basic analysis — sign in for AI feedback</p>
          <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
            AI coaching and pronunciation scoring run on your account, so as a guest you get offline
            grammar checks only. <Link to="/login" className="font-semibold text-cyan-300 underline underline-offset-2">Sign in</Link> to get the full feedback on your next answer.
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
