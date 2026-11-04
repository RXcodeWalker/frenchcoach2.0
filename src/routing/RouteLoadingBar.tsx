import { useEffect, useState } from 'react';
import { useWaitingForScreen } from './routeLoading';

/** A screen that arrives within this long shows no bar at all (most taps, and every one once cached). */
export const ROUTE_BAR_DELAY_MS = 250;

/**
 * A thin bar along the top while the next screen's code downloads (code
 * splitting). The current screen stays on display meanwhile — navigation is a
 * React transition — so this is the only sign a tap was registered on a slow
 * connection. One fill, never a loop.
 */
export function RouteLoadingBar() {
  const waiting = useWaitingForScreen();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!waiting) {
      setShown(false);
      return;
    }
    const id = setTimeout(() => setShown(true), ROUTE_BAR_DELAY_MS);
    return () => clearTimeout(id);
  }, [waiting]);

  if (!shown) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading the next screen"
      data-testid="route-loading-bar"
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px]"
    >
      <div
        className="h-full origin-left bg-action"
        style={{ animation: 'routeProgress 8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      />
    </div>
  );
}
