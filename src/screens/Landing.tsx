import { MarketingLayout } from '../components/layout/MarketingLayout';
import { Hero } from './landing/Hero';
import { HowItWorks } from './landing/HowItWorks';
import { Benefits } from './landing/Benefits';
import { ExamPrep } from './landing/ExamPrep';
import { Founder } from './landing/Founder';
import { Faq } from './landing/Faq';
import { FinalCta } from './landing/FinalCta';
import { LANDING_SECTIONS } from './landing/landingContent';

export function Landing() {
  return (
    <MarketingLayout route="/" sections={LANDING_SECTIONS}>
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
