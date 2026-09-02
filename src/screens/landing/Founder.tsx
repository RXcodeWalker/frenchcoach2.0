import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

const BLOG_URL = 'https://blog.beyondthebasics.me/article/why-i-started-building-french-coach';

export function Founder() {
  return (
    <Section>
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
          <a href={BLOG_URL} target="_blank" rel="noopener" className="mk-link text-sm underline">
            Read the story →
          </a>
        </div>
      </Reveal>
    </Section>
  );
}
