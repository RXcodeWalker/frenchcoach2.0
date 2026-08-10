import { MarketingLayout } from '../components/layout/MarketingLayout';
import { AboutContent } from './AboutContent';

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'About' },
];

// Logged-out, non-guest rendering of /about — mounted by PublicRoutes, no
// AppProvider/AuthContext dependency. The signed-in/guest rendering is
// About.tsx (TopContextBar + PageShell), mounted by AppShell's gated tree.
// Both wrap the same AboutContent.
export function AboutPublic() {
  return (
    <MarketingLayout route="/about" breadcrumb={BREADCRUMB}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <AboutContent />
      </div>
    </MarketingLayout>
  );
}
