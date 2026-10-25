import { ArrowDown } from 'lucide-react';
import { Eyebrow } from '../../components/marketing/Eyebrow';
import { CtaButton } from '../../components/marketing/CtaButton';
import { Reveal } from '../../components/marketing/Reveal';
import { enterGuestMode } from '../../hooks/useGuestMode';
import { LiveFeedbackDemo } from './LiveFeedbackDemo';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="mk-hero-glow absolute inset-0 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
        <Reveal immediate>
          <Eyebrow>IGCSE French · Speaking exam practice</Eyebrow>
          <h1 className="font-display text-[40px] sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Speak French out loud.{' '}
            <span className="italic font-normal" style={{ color: 'var(--mk-accent)' }}>Know exactly what to fix.</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-8 max-w-lg" style={{ color: 'var(--mk-ink-muted)' }}>
            Answer exam-style speaking questions, get clear feedback on every answer, and sit full
            mock exams marked against the Cambridge 0520 speaking criteria.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-4">
            <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
            <a href="#how-it-works" className="mk-link mk-focus inline-flex items-center gap-1.5 text-sm font-semibold min-h-[44px] rounded-full self-start sm:self-auto">
              See how it works
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm" style={{ color: 'var(--mk-ink-faint)' }}>
            No account needed to try.
          </p>
        </Reveal>

        <Reveal immediate delayMs={120}>
          <LiveFeedbackDemo />
        </Reveal>
      </div>
    </section>
  );
}
