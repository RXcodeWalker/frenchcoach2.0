import { motion } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { fadeUp } from '../components/motion/variants';
import { AboutContent } from './AboutContent';
import { Seo } from '../components/SEO';

// Signed-in / guest rendering of /about, reached via SideRail inside
// AppShell's gated tree. The logged-out public rendering (MarketingLayout,
// no AppProvider) is AboutPublic.tsx, mounted by PublicRoutes.tsx — see
// App.tsx's early return for logged-out non-guest visitors.
export function About() {
  return (
    <div className="flex flex-col min-h-screen">
      <Seo route="/about" />
      <TopContextBar
        title="About Français AI"
        subtitle="The Elite Speaking Coach for IGCSE French"
      />

      <PageShell>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <AboutContent />
        </motion.div>
      </PageShell>
    </div>
  );
}
