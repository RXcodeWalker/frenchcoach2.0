import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { MemoryVignette } from '../../components/marketing/vignettes/MemoryVignette';

export function Memory() {
  return (
    <Section>
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-5xl leading-tight mb-6">
              Your practice shouldn't reset every time you close the app.
            </h2>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--mk-ink-muted)' }}>
              Each session builds on the last. What you got right, what you struggled with, and
              how confident the coach is in each — all of it carries forward, so session four
              picks up where session one left off.
            </p>
          </div>
          <MemoryVignette />
        </div>
      </Reveal>
    </Section>
  );
}
