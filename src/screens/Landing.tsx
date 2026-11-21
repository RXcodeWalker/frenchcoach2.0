import { MarketingLayout } from '../components/layout/MarketingLayout';
import { useScrollToHash } from '../components/marketing/useScrollToHash';
import { Hero } from './landing/Hero';
import { HowItWorks } from './landing/HowItWorks';
import { Benefits } from './landing/Benefits';
import { ExamPrep } from './landing/ExamPrep';
import { Founder } from './landing/Founder';
import { Faq } from './landing/Faq';
import { FinalCta } from './landing/FinalCta';

export function Landing() {
  useScrollToHash();
  return (
    <MarketingLayout route="/" landing>
      <Hero />
      <HowItWorks />
      <Benefits />
      <ExamPrep />
      <Founder />
      <Faq />
      <FinalCta />
    </MarketingLayout>
  );
}
