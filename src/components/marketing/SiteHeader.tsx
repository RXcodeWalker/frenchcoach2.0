import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { startPractisingFree, trackSignInLink } from './startPractisingFree';
import { SITE_NAV, isSectionItem, navHref } from './siteNav';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  /** True on the landing page: section items become same-page anchors with scroll-spy. */
  onLanding?: boolean;
  /** The page's own path, so its nav item is marked as the current page ("/story"). */
  currentPath?: string;
  breadcrumb?: BreadcrumbItem[];
}

const SECTION_IDS: string[] = SITE_NAV.filter(isSectionItem).map((item) => item.section);

/**
 * Which section is under the reading line (40% down the viewport). Effect
 * only, so the prerendered markup is unaffected; until it runs nothing is
 * highlighted.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    const els = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order wins when two sections touch the reading line.
        setActive(els.find((el) => visible.has(el.id))?.id ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/**
 * The marketing sticky header, identical on every public page (`SITE_NAV`).
 * Desktop: inline links; on the landing page the section under the reading
 * line is highlighted, on a page of its own (Our story) that page is. Phone: a
 * menu button that opens a panel with the same links. "Sign in" and the
 * primary CTA stay visible at every width.
 */
export function SiteHeader({ onLanding = false, currentPath, breadcrumb }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Scroll-spy only has sections to watch on the landing page.
  const active = useActiveSection(onLanding ? SECTION_IDS : []);

  const navItems = SITE_NAV.map((item) => {
    const href = navHref(item, onLanding);
    let current: 'true' | 'page' | undefined;
    if (isSectionItem(item)) {
      if (onLanding && active === item.section) current = 'true';
    } else if (item.path === currentPath) {
      current = 'page';
    }
    return { label: item.label, href, current };
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    // Rotating to desktop width hides the button — close the panel with it.
    const mq = window.matchMedia('(min-width: 768px)');
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen]);

  return (
    <header className="mk-header sticky top-0 z-50 border-b mk-hairline">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <a href="/" className="mk-focus flex items-center gap-2 shrink-0 rounded-md min-h-[44px]" aria-label="French Coach home">
          <span aria-hidden="true" className="mk-logo-mark">F</span>
          <span className="font-display text-[17px] leading-none">French Coach</span>
        </a>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.current}
              className="mk-navlink mk-focus text-[13px] font-medium px-3 py-2 rounded-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a href="/login" onClick={() => trackSignInLink('header_sign_in')} className="mk-navlink mk-focus text-[13px] font-semibold px-2 sm:px-3 min-h-[44px] inline-flex items-center rounded-full">
            Sign in
          </a>
          <button
            type="button"
            onClick={() => startPractisingFree('header_start')}
            className="mk-cta mk-focus px-3.5 sm:px-4 min-h-[44px] rounded-full text-[13px] font-semibold whitespace-nowrap"
          >
            {/* Shorter on phones so logo, Sign in, CTA and menu fit in 343px. */}
            <span className="sm:hidden">Start free</span>
            <span className="hidden sm:inline">Get started</span>
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            className="md:hidden mk-focus inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-full"
            aria-expanded={menuOpen}
            aria-controls="mk-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="mk-mobile-menu" hidden={!menuOpen} className="md:hidden border-t mk-hairline">
        <nav aria-label="Menu" className="max-w-6xl mx-auto px-4 py-3 flex flex-col">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={item.current}
              className="mk-navlink mk-focus text-base font-medium px-3 min-h-[48px] flex items-center rounded-xl"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="max-w-6xl mx-auto px-4 md:px-6 pb-3 text-xs"
          style={{ color: 'var(--mk-ink-faint)' }}
        >
          <ol className="flex items-center flex-wrap gap-1.5">
            {breadcrumb.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                {item.href ? (
                  <a href={item.href} className="mk-link">
                    {item.label}
                  </a>
                ) : (
                  <span style={{ color: 'var(--mk-ink-muted)' }}>{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
