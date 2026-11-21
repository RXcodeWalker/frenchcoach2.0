import { useEffect } from 'react';

/**
 * Scrolls to the section named by the URL hash once the page has rendered.
 *
 * The shared header links to `/#faq` from every other public page. The browser
 * only scrolls to a fragment that exists when the document loads, and the
 * landing page is drawn by React after that, so without this a cross-page
 * jump lands at the top. Effect-only, so the prerendered markup is unchanged.
 * Honours "reduce motion" by jumping instead of gliding.
 */
export function useScrollToHash(): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Next frame: the sections have laid out, and the sticky header's offset
    // comes from the section's scroll-margin-top.
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
}
