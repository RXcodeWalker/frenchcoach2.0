import { MarketingLayout } from '../components/layout/MarketingLayout';
import { Hero } from './landing/Hero';
import { Problem } from './landing/Problem';
import { Difference } from './landing/Difference';
import { HowItWorks } from './landing/HowItWorks';
import { Capabilities } from './landing/Capabilities';
import { ExamPrep } from './landing/ExamPrep';
import { Memory } from './landing/Memory';
import { Founder } from './landing/Founder';
import { HowScoringWorks } from './landing/HowScoringWorks';
import { FinalCta } from './landing/FinalCta';

export function Landing() {
  return (
    <MarketingLayout route="/">
      <Hero />
      <Problem />
      <Difference />
      <HowItWorks />
      <Capabilities />
      <ExamPrep />
      <Memory />
      <Founder />
      <HowScoringWorks />
      <FinalCta />
    </MarketingLayout>
  );
}
