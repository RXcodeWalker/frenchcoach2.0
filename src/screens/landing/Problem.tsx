import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

export function Problem() {
  return (
    <Section>
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-center">
          <div>
            <p className="font-display leading-[0.85] tracking-tight text-8xl md:text-9xl">
              60<span className="text-4xl md:text-5xl" style={{ color: 'var(--mk-accent)' }}>s</span>
            </p>
            <p className="text-sm mt-4 max-w-[300px]" style={{ color: 'var(--mk-ink-faint)' }}>
              How long a student speaks out loud in a typical French lesson.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl md:text-5xl leading-tight mb-5">
              Most students don't lack French.<br />They lack turns to speak it.
            </h2>
            <p className="text-base md:text-lg leading-relaxed max-w-lg" style={{ color: 'var(--mk-ink-muted)' }}>
              Thirty students, two lessons a week, one teacher — the arithmetic doesn't leave
              room for more. Français AI gives you the turns: as many as you want, each one
              marked and explained.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
