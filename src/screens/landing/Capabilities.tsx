import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

const CAPABILITIES = [
  {
    title: 'Real spoken answers',
    body: 'Record your response, get it transcribed, and get coached on what you actually said — not a typed approximation.',
  },
  {
    title: 'Cambridge-aligned exam scoring',
    body: 'Practice exam answers are marked against the published Cambridge IGCSE 0520 Paper 3 mark scheme, out of 40.',
  },
  {
    title: 'Phoneme-level pronunciation',
    body: 'Word- and phoneme-level pronunciation feedback where the assessment is available — and it says nothing rather than fabricate a score when it isn’t.',
  },
  {
    title: 'Sessions that adapt',
    body: 'Questions are chosen across five cognitive demands and five session slots, adjusting mid-session to what you’re showing.',
  },
  {
    title: 'A coach that remembers',
    body: 'An append-only evidence log with time-decayed confidence, and reliability floors so one garbled answer can’t skew your whole profile.',
  },
];

export function Capabilities() {
  return (
    <Section>
      <Reveal>
        <h2 className="font-display text-3xl md:text-5xl leading-tight mb-14 max-w-2xl">
          What it actually does
        </h2>
      </Reveal>
      <div className="max-w-3xl">
        {CAPABILITIES.map((c, i) => (
          <Reveal key={c.title}>
            <div className={`py-6 ${i > 0 ? 'border-t mk-hairline' : ''}`}>
              <h3 className="text-base font-semibold mb-2">{c.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
                {c.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
