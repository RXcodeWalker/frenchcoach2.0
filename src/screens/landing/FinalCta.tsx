import { Section } from '../../components/marketing/Section';
import { CtaButton } from '../../components/marketing/CtaButton';
import { Reveal } from '../../components/marketing/Reveal';
import { enterGuestMode } from '../../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

export function FinalCta() {
  return (
    <Section>
      <Reveal>
        <div className="mk-card relative overflow-hidden rounded-[32px] px-6 py-14 md:px-12 md:py-20 text-center">
          <div aria-hidden="true" className="mk-hero-glow absolute inset-0 pointer-events-none" />
          <div className="relative flex flex-col items-center">
            <h2 className="font-display text-3xl md:text-5xl leading-[1.1] mb-5 max-w-2xl">
              Your French is already in there. Time to say it out loud.
            </h2>
            <p className="text-base md:text-lg mb-8 max-w-md" style={{ color: 'var(--mk-ink-muted)' }}>
              Answer your first question in the next minute. No account needed to try.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
              <CtaButton href="/login" variant="secondary">Sign in</CtaButton>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
