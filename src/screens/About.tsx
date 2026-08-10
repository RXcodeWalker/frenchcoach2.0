import { motion } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { fadeUp } from '../components/motion/variants';
import { AboutContent } from './AboutContent';

export function About() {
  return (
    <div className="flex flex-col min-h-screen">
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
