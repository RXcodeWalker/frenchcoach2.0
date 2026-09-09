import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  /** Up to three stat pills (ui/Stat). Never a CTA — the top bar carries no action. */
  stats?: ReactNode;
  /** Scroll position of the scrolling container; 0 keeps the bar transparent. */
  scrollY?: number;
  className?: string;
}

/**
 * The 56px top context bar (Component Kit §03). Transparent at scroll 0, then
 * --surface + hairline + --shadow-overlay once the page scrolls. Screen title
 * on the left, at most three stat pills on the right. It never carries a CTA.
 *
 * Pass `scrollY` from the scrolling container; if omitted it listens to the
 * window.
 */
export function TopContextBar({ title, stats, scrollY, className = '' }: Props) {
  const [windowScrolled, setWindowScrolled] = useState(false);

  useEffect(() => {
    if (scrollY !== undefined) return;
    const onScroll = () => setWindowScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollY]);

  const scrolled = scrollY !== undefined ? scrollY > 0 : windowScrolled;

  return (
    <div
      className={`sticky top-0 z-40 flex h-14 items-center justify-between px-4
        transition-colors duration-overlay ease-smooth
        ${scrolled ? 'surface-raised' : 'bg-transparent border-b border-transparent'} ${className}`}
    >
      <span className="text-subtitle text-ink truncate">{title}</span>
      {stats != null && <div className="flex items-center gap-1.5">{stats}</div>}
    </div>
  );
}
