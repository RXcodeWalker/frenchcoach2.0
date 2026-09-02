import { useEffect, useRef, type ReactNode } from 'react';

// SSR-safe reveal-on-scroll. Renders a plain div with no inline opacity, so
// the prerendered/static markup is fully visible to crawlers and no-JS
// visitors. Only once mounted does documentElement gain `mk-js` — the CSS in
// marketing.css hides `.mk-reveal` solely under that class, then this
// IntersectionObserver flips `.is-in` to fade/translate it into view.
// prefers-reduced-motion neutralises the effect entirely via CSS.
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('mk-js');
    const el = ref.current;
    if (!el) return;

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
  }, []);

  return (
    <div ref={ref} className={`mk-reveal ${className}`}>
      {children}
    </div>
  );
}
