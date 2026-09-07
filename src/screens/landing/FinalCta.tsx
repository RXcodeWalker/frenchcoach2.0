import { Section } from '../../components/marketing/Section';
import { CtaButton } from '../../components/marketing/CtaButton';
import { enterGuestMode } from '../../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

export function FinalCta() {
  return (
    <Section className="text-center">
      <h2 className="font-display text-3xl md:text-5xl leading-tight mb-8 max-w-2xl mx-auto">
        Your French is already in there. It's time to start speaking it.
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
        <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
        <CtaButton href="/igcse-french-speaking" variant="secondary">Read the exam guide</CtaButton>
      </div>
      <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>
        No account, no card. Your first session takes twelve minutes.
      </p>
    </Section>
  );
}
