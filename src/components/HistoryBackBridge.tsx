import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBrowserBackGuard } from '../lib/historyBackGuard';

/**
 * Connects `historyBackGuard.ts` to the page: listens for `popstate` (Back / Forward) and
 * tells the guard about every router navigation, so a guarded screen keeps its sentinel
 * history entry on top. Renders nothing; mounted once in `App`.
 */
export function HistoryBackBridge() {
  const location = useLocation();

  useEffect(() => {
    const guard = getBrowserBackGuard();
    if (!guard) return;
    const onPop = () => guard.onPopState();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    getBrowserBackGuard()?.onLocationChange();
  }, [location]);

  return null;
}
