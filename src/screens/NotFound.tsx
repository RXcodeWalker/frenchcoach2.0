import { MarketingLayout } from '../components/layout/MarketingLayout';

// Rendered by PublicRoutes for any unmatched path a logged-out, non-guest
// visitor hits.
export function NotFound() {
  return (
    <MarketingLayout route="/404">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-20 text-center">
        <h1 className="text-3xl md:text-4xl font-black mb-4">Page not found</h1>
        <p className="text-ink-muted text-lg leading-relaxed mb-8">
          That page doesn't exist. Here are a few places to go instead:
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/"
            className="px-6 py-3 bg-violet-electric hover:bg-violet-600 text-white rounded-xl font-bold transition-colors"
          >
            Go home
          </a>
          <a
            href="/igcse-french-speaking"
            className="px-6 py-3 surface border-white/10 rounded-xl font-bold hover:text-violet-400 transition-colors"
          >
            IGCSE Speaking exam guide
          </a>
          <a
            href="/french-roleplay-practice"
            className="px-6 py-3 surface border-white/10 rounded-xl font-bold hover:text-violet-400 transition-colors"
          >
            Roleplay practice
          </a>
        </div>
      </div>
    </MarketingLayout>
  );
}
