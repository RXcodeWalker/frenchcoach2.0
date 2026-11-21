import type { ReactNode } from 'react';
import { Seo } from '../SEO';
import type { PageSeo } from '../../config/seo';
import { SiteHeader } from '../marketing/SiteHeader';
import { SITE_ABOUT_LINKS, SITE_LINK_GROUPS } from '../marketing/siteLinks';

const FOOTER_LINK = 'mk-link mk-focus text-sm min-h-[44px] inline-flex items-center rounded';

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
  /** The landing page: the header's section items scroll in place and track the reading position. */
  landing?: boolean;
  /** A head built from the page's content (public topic / role-play pages); otherwise PAGE_SEO[route]. */
  seo?: PageSeo;
}

// Router-free, AppProvider-free, motion-free shell for public marketing pages
// (Landing, Story, IgcseFrenchSpeaking, FrenchRoleplayPractice). Must stay
// SSR-safe for the Stage C prerender: no window/localStorage during render,
// no framer-motion. <a href> throughout, not <Link>, so each marketing page
// stays a cheap, independently-loadable static document. The `.marketing`
// class scopes src/styles/marketing.css's editorial tokens to this tree only
// — app screens never see them.
export function MarketingLayout({ children, breadcrumb, route, landing = false, seo }: Props) {
  return (
    <div className="marketing min-h-screen flex flex-col">
      <Seo route={route} entry={seo} />
      <SiteHeader onLanding={landing} currentPath={route} breadcrumb={breadcrumb} />

      <main className="flex-1">{children}</main>

      <footer className="border-t mk-hairline mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm">
          <div className="lg:col-span-1">
            <p className="font-semibold mb-2 font-display text-lg">French Coach</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
              Speaking-practice coach for IGCSE French learners. An independent practice tool, not affiliated with or
              endorsed by Cambridge Assessment International Education.
            </p>
          </div>
          {SITE_LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col items-start">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--mk-ink-faint)' }}>
                {group.title}
              </p>
              {group.links.map((link) => (
                <a key={link.href} href={link.href} className={FOOTER_LINK} style={{ color: 'var(--mk-ink-muted)' }}>
                  {link.label}
                </a>
              ))}
            </nav>
          ))}
          <nav aria-label="About French Coach" className="flex flex-col items-start">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--mk-ink-faint)' }}>
              French Coach
            </p>
            {SITE_ABOUT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={FOOTER_LINK} style={{ color: 'var(--mk-ink-muted)' }}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
