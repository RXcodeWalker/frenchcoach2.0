import type { ReactNode } from 'react';
import { Seo } from '../SEO';
import { SiteHeader, type HeaderSection } from '../marketing/SiteHeader';

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
  /** In-page sections for the sticky header's anchor nav (the landing page). */
  sections?: readonly HeaderSection[];
}

const NAV_LINKS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Exam guide', href: '/igcse-french-speaking' },
  { label: 'Our story', href: '/story' },
];

// Router-free, AppProvider-free, motion-free shell for public marketing pages
// (Landing, About, IgcseFrenchSpeaking, FrenchRoleplayPractice). Must stay
// SSR-safe for the Stage C prerender: no window/localStorage during render,
// no framer-motion. <a href> throughout, not <Link>, so each marketing page
// stays a cheap, independently-loadable static document. The `.marketing`
// class scopes src/styles/marketing.css's editorial tokens to this tree only
// — app screens never see them.
export function MarketingLayout({ children, breadcrumb, route, sections }: Props) {
  return (
    <div className="marketing min-h-screen flex flex-col">
      <Seo route={route} />
      <SiteHeader sections={sections} links={NAV_LINKS} breadcrumb={breadcrumb} />

      <main className="flex-1">{children}</main>

      <footer className="border-t mk-hairline mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-semibold mb-2 font-display text-lg">Français AI</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
              Speaking-practice coach for IGCSE French learners.
            </p>
          </div>
          <div className="flex flex-col items-start">
            <a href="/igcse-french-speaking" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              IGCSE French Speaking Exam guide
            </a>
            <a href="/french-roleplay-practice" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              French roleplay practice scenarios
            </a>
            <a href="/about" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              About Français AI
            </a>
          </div>
          <div className="flex flex-col items-start">
            <a href="/login" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              Sign in to your account
            </a>
            <a href="/privacy" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              Privacy Policy
            </a>
            <a href="/terms" className="mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded" style={{ color: 'var(--mk-ink-muted)' }}>
              Terms of Service
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
              Français AI is an independent practice tool, not affiliated with or endorsed by
              Cambridge Assessment International Education.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
