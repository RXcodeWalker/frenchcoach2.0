import { useEffect, useState, type ReactNode } from 'react';
import { prepareStorageScope, setStorageScope } from '../services/persistence/storage';

interface Props {
  identity: string;
  children: ReactNode;
}

/**
 * Establishes identity-scoped storage before AppProvider ever mounts beneath
 * it. Scope preparation (legacy/guest copy) is real localStorage I/O and must
 * run in an effect, never render or a lazy initializer — see auth overhaul
 * plan §5 for why. Rendered with key={identity} by AppShell so any identity
 * change forces a full remount, resetting `ready` and re-running preparation.
 */
export function IdentityScopeGate({ identity, children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    prepareStorageScope(identity);
    setStorageScope(identity);
    setReady(true);
  }, [identity]);

  if (!ready) {
    return (
      <div className="min-h-screen dark:bg-slate-950 bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
