import { MarketingLayout } from '../components/layout/MarketingLayout';
import { Hero } from './landing/Hero';
import { Problem } from './landing/Problem';
import { Difference } from './landing/Difference';
import { HowItWorks } from './landing/HowItWorks';
import { HowScoringWorks } from './landing/HowScoringWorks';
import { ExamPrep } from './landing/ExamPrep';
import { Founder } from './landing/Founder';
import { FinalCta } from './landing/FinalCta';

export function Landing() {
  return (
    <MarketingLayout route="/">
      <Hero />
      <Problem />
      <Difference />
      <HowItWorks />
      <HowScoringWorks />
      <ExamPrep />
      <Founder />
      <FinalCta />
    </MarketingLayout>
  );
}
