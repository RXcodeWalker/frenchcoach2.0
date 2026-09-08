import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

// SSR-safe reveal-on-scroll (or reveal-on-mount). Renders a plain div with no
// inline opacity, so the prerendered/static markup is fully visible to
// crawlers and no-JS visitors. Only once mounted does documentElement gain
// `mk-js` — the CSS in marketing.css hides `.mk-reveal` solely under that
// class, then this effect flips `.is-in` to fade/translate it into view.
// prefers-reduced-motion neutralises the effect entirely via CSS.
//
// `immediate` skips the IntersectionObserver and reveals on the next frame
// instead — for above-the-fold content (Hero, Story's opening section) that's
// already in view on load, where "reveal on scroll" would never fire.
// `delayMs` staggers a group of siblings (e.g. a row of cards) via
// transition-delay; it's the only inline style this component ever sets, and
// it never touches opacity, so the SSR-visibility guarantee above still holds.
export function Reveal({
  children,
  className = '',
  immediate = false,
  delayMs,
}: {
  children: ReactNode;
  className?: string;
  immediate?: boolean;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('mk-js');
    const el = ref.current;
    if (!el) return;

    if (immediate) {
      const frame = requestAnimationFrame(() => el.classList.add('is-in'));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const style: CSSProperties | undefined =
    delayMs !== undefined ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <div ref={ref} className={`mk-reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
