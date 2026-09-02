import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { FeedbackVignette } from '../../components/marketing/vignettes/FeedbackVignette';
import { AdaptiveVignette } from '../../components/marketing/vignettes/AdaptiveVignette';
import { PronunciationVignette } from '../../components/marketing/vignettes/PronunciationVignette';
import { MemoryVignette } from '../../components/marketing/vignettes/MemoryVignette';

const STEPS = [
  {
    n: '01',
    title: 'Speak',
    body: 'Record a spoken answer to a role-play or topic-conversation question, out loud, in French.',
    vignette: <PronunciationVignette />,
  },
  {
    n: '02',
    title: 'Get coached',
    body: 'Your transcript is marked and every piece of feedback is checked against what you actually said.',
    vignette: <FeedbackVignette />,
  },
  {
    n: '03',
    title: 'See the pattern',
    body: 'Mistakes are tracked by skill over time, so you can see which structures still need work.',
    vignette: <MemoryVignette />,
  },
  {
    n: '04',
    title: 'Practice adapts',
    body: 'The next session is planned around your weak spots, not a fixed order of topics.',
    vignette: <AdaptiveVignette />,
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Reveal>
        <h2 className="font-display text-3xl md:text-5xl leading-tight mb-14 max-w-2xl">
          How it works
        </h2>
      </Reveal>
      <div className="space-y-16 md:space-y-20">
        {STEPS.map((step) => (
          <Reveal key={step.n}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div>
                <p className="font-display text-2xl mb-3" style={{ color: 'var(--mk-accent)' }}>
                  {step.n}
                </p>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--mk-ink-muted)' }}>
                  {step.body}
                </p>
              </div>
              {step.vignette}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
