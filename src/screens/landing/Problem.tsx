import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

export function Problem() {
  return (
    <Section>
      <Reveal>
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-6">Sixty seconds.</h2>
          <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
            That's roughly how long each student gets to speak out loud in a typical French
            classroom lesson. Thirty students, two lessons a week, one teacher — the arithmetic
            doesn't leave room for more. Most students don't lack French. They lack turns to speak
            it.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
