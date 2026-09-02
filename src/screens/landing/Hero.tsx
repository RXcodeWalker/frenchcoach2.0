import { Eyebrow } from '../../components/marketing/Eyebrow';
import { CtaButton } from '../../components/marketing/CtaButton';
import { ExamResultVignette } from '../../components/marketing/vignettes/ExamResultVignette';
import { enterGuestMode } from '../../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

export function Hero() {
  return (
    <section className="pt-14 md:pt-20 pb-16 md:pb-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <Eyebrow>AI speaking practice for IGCSE French</Eyebrow>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] mb-6">
            Speak French.<br />For real.
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-8 max-w-md" style={{ color: 'var(--mk-ink-muted)' }}>
            Record spoken answers, get coached like an examiner would, and watch your practice
            adapt to what you actually struggle with — not a fixed syllabus.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
            <CtaButton href="#how-it-works" variant="secondary">
              See how it works
            </CtaButton>
          </div>
          <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>
            Early preview — in active development
          </p>
        </div>

        <ExamResultVignette />
      </div>
    </section>
  );
}
