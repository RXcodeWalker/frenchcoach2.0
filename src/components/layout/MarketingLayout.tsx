import type { ReactNode } from 'react';
import { Seo } from '../SEO';
import { enterGuestMode } from '../../hooks/useGuestMode';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  children: ReactNode;
  /** Rendered as a visible breadcrumb trail. Omit on the root landing page. */
  breadcrumb?: BreadcrumbItem[];
  /** Path-only route key looked up in PAGE_SEO, e.g. "/about". */
  route: string;
}

const NAV_LINKS = [
  { label: 'Product', href: '/#how-it-works' },
  { label: 'Exam', href: '/igcse-french-speaking' },
  { label: 'Story', href: '/about' },
];

// Plain function, not a hook — safe to call from an onClick handler without
// making this component stateful, so MarketingLayout stays context-free and
// SSR-safe (this never runs during render).
function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

// Router-free, AppProvider-free, motion-free shell for public marketing pages
// (Landing, About, IgcseFrenchSpeaking, FrenchRoleplayPractice). Must stay
// SSR-safe for the Stage C prerender: no window/localStorage during render,
// no framer-motion. <a href> throughout, not <Link>, so each marketing page
// stays a cheap, independently-loadable static document. The `.marketing`
// class scopes src/styles/marketing.css's editorial tokens to this tree only
// — app screens never see them.
export function MarketingLayout({ children, breadcrumb, route }: Props) {
  return (
    <div className="marketing min-h-screen flex flex-col">
      <Seo route={route} />
      <header className="sticky top-0 z-50 border-b mk-hairline backdrop-blur" style={{ background: 'color-mix(in srgb, var(--mk-bg) 88%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="text-sm font-semibold tracking-tight font-display text-lg">Français AI</span>
          </a>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="mk-link text-xs font-medium">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a href="/login" className="mk-link text-xs font-semibold">
              Log in
            </a>
            <button onClick={startPractisingFree} className="mk-cta px-4 py-2 rounded-full text-xs font-semibold">
              Start free
            </button>
          </div>
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

      <main className="flex-1">{children}</main>

      <footer className="border-t mk-hairline mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-semibold mb-2 font-display text-lg">Français AI</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
              Speaking-practice coach for IGCSE French learners.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/igcse-french-speaking" className="mk-link text-xs" style={{ color: 'var(--mk-ink-muted)' }}>
              IGCSE French Speaking Exam guide
            </a>
            <a href="/french-roleplay-practice" className="mk-link text-xs" style={{ color: 'var(--mk-ink-muted)' }}>
              French roleplay practice scenarios
            </a>
            <a href="/about" className="mk-link text-xs" style={{ color: 'var(--mk-ink-muted)' }}>
              About Français AI
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/login" className="mk-link text-xs" style={{ color: 'var(--mk-ink-muted)' }}>
              Log in to your account
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
