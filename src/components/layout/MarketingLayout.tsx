import type { ReactNode } from 'react';
import { Seo } from '../SEO';

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

// Router-free, AppProvider-free, motion-free shell for public marketing pages
// (Landing, About, IgcseFrenchSpeaking, FrenchRoleplayPractice). Must stay
// SSR-safe for the Stage C prerender: no window/localStorage during render,
// no framer-motion. <a href> throughout, not <Link>, so each marketing page
// stays a cheap, independently-loadable static document.
export function MarketingLayout({ children, breadcrumb, route }: Props) {
  return (
    <div className="min-h-screen dark:bg-navy bg-slate-100 dark:text-white text-slate-900 flex flex-col">
      <Seo route={route} />
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-electric to-indigo-500 flex items-center justify-center"
              style={{ boxShadow: '0 0 16px rgba(124, 58, 237, 0.3)' }}
            >
              <span className="text-xs font-black text-white">F</span>
            </span>
            <span className="text-sm font-black tracking-tight">Français AI</span>
          </a>

          <a
            href="/login"
            className="px-4 py-2 rounded-xl glass border-white/10 text-xs font-bold hover:text-violet-400 transition-colors"
          >
            Log in
          </a>
        </div>

        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="max-w-5xl mx-auto px-4 md:px-6 pb-3 text-xs text-slate-500"
          >
            <ol className="flex items-center flex-wrap gap-1.5">
              {breadcrumb.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {item.href ? (
                    <a href={item.href} className="hover:text-violet-400 transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-300">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-black mb-2">Français AI</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Speaking-practice coach for IGCSE French learners.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/igcse-french-speaking" className="text-slate-500 hover:text-violet-400 transition-colors text-xs">
              IGCSE French Speaking Exam guide
            </a>
            <a href="/french-roleplay-practice" className="text-slate-500 hover:text-violet-400 transition-colors text-xs">
              French roleplay practice scenarios
            </a>
            <a href="/about" className="text-slate-500 hover:text-violet-400 transition-colors text-xs">
              About Français AI
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/login" className="text-slate-500 hover:text-violet-400 transition-colors text-xs">
              Log in to your account
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
