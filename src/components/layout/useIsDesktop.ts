import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

const matches = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function' ? true : window.matchMedia(QUERY).matches;

/**
 * True at the desktop breakpoint (md, 768px) — the same line where the rail
 * replaces the dock. For layouts whose content differs, not just its sizing
 * (Home's mission stack vs compact stage); prefer CSS breakpoints otherwise.
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return desktop;
}
