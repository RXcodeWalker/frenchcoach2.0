import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

export function Difference() {
  return (
    <Section>
      <Reveal>
        <h2 className="font-display text-3xl md:text-5xl leading-tight mb-12 max-w-2xl">
          More than conversation. Coaching.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="border-t mk-hairline-strong pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-ink-faint)' }}>
              Generic practice
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              A conversation partner that responds naturally, but leaves you to notice your own
              mistakes and figure out what to work on next.
            </p>
          </div>
          <div className="border-t pt-5" style={{ borderColor: 'var(--mk-accent)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-accent)' }}>
              Coached practice
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              Every answer is marked against a real rubric, every claim in your feedback is
              checked against your own transcript, and the next question is chosen based on what
              you got wrong.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
