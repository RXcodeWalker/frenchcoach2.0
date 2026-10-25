import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { enterGuestMode } from '../../hooks/useGuestMode';

export interface HeaderLink {
  label: string;
  href: string;
}

export interface HeaderSection {
  id: string;
  label: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  /** In-page sections (the landing page): shown as anchor links with scroll-spy. */
  sections?: readonly HeaderSection[];
  /** Cross-page links, used when there are no in-page sections. */
  links: HeaderLink[];
  breadcrumb?: BreadcrumbItem[];
}

// Plain function, not a hook — safe to call from an onClick handler without
// making this component stateful (this never runs during render).
function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

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
 * The marketing sticky header. Desktop: inline links (in-page sections with
 * the current one highlighted, or cross-page links). Phone: a menu button that
 * opens a panel with the same links. "Sign in" and the primary CTA stay
 * visible at every width.
 */
export function SiteHeader({ sections, links, breadcrumb }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(sections?.map((s) => s.id) ?? []);

  const navItems: HeaderLink[] = sections
    ? sections.map((s) => ({ label: s.label, href: `#${s.id}` }))
    : links;

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

  const isActive = (href: string) => sections !== undefined && active !== null && href === `#${active}`;

  return (
    <header className="mk-header sticky top-0 z-50 border-b mk-hairline">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <a href="/" className="mk-focus flex items-center gap-2 shrink-0 rounded-md min-h-[44px]" aria-label="Français AI home">
          <span aria-hidden="true" className="mk-logo-mark">F</span>
          <span className="font-display text-[17px] leading-none">Français AI</span>
        </a>

        <nav aria-label={sections ? 'Page sections' : 'Primary'} className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'true' : undefined}
              className="mk-navlink mk-focus text-[13px] font-medium px-3 py-2 rounded-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a href="/login" className="mk-navlink mk-focus text-[13px] font-semibold px-2 sm:px-3 min-h-[44px] inline-flex items-center rounded-full">
            Sign in
          </a>
          <button
            type="button"
            onClick={startPractisingFree}
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
              aria-current={isActive(item.href) ? 'true' : undefined}
              className="mk-navlink mk-focus text-base font-medium px-3 min-h-[48px] flex items-center rounded-xl"
            >
              {item.label}
            </a>
          ))}
          {sections && (
            <>
              <span aria-hidden="true" className="my-2 mx-3 border-t mk-hairline" />
              {/* Other pages only — a "/#section" link would repeat a section above. */}
              {links
                .filter((item) => !item.href.startsWith('/#'))
                .map((item) => (
                  <a key={item.href} href={item.href} className="mk-navlink mk-focus text-base px-3 min-h-[48px] flex items-center rounded-xl" style={{ color: 'var(--mk-ink-muted)' }}>
                    {item.label}
                  </a>
                ))}
            </>
          )}
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
