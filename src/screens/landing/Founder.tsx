import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

const STATS = [
  { value: '97%', label: 'IGCSE French (A*)' },
  { value: 'A2 · B1', label: 'DELF, both with distinction' },
  { value: '30', label: 'roleplay scenarios authored' },
];

export function Founder() {
  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-14 items-start">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl leading-tight mb-6">Why I built this</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--mk-ink-muted)' }}>
              I went to a bilingual school where French started as just another timetable subject.
              By Grade 10, I could read and write it fine — but put on the spot to actually speak
              it, I froze.
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--mk-ink-muted)' }}>
              I ended up scoring 97% (A*) in IGCSE French, with DELF A2 and B1 distinctions, mostly
              by finding ways to practise speaking that my classroom couldn't give me thirty
              students at a time. Français AI is that practice, built for anyone else stuck in the
              same gap.
            </p>
            <p className="text-sm font-semibold mb-1">Om Jhamvar</p>
            <a href="/story" className="mk-link text-sm underline">
              Read the story →
            </a>
          </div>
        </Reveal>
        <Reveal>
          <div className="rounded-2xl border mk-hairline mk-surface p-6 flex flex-col gap-4">
            {STATS.map((s, i) => (
              <div key={s.label}>
                {i > 0 && <div className="h-px mb-4" style={{ background: 'var(--mk-hairline)' }} />}
                <p className="font-display text-3xl">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--mk-ink-faint)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
