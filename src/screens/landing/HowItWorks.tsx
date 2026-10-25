import type { ReactNode } from 'react';
import { Mic, Check } from 'lucide-react';
import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { SectionHeading } from './SectionHeading';

// Real Learn topic labels, as the topic grid shows them (src/data/questions.ts).
const TOPICS = ['Les vacances', 'L’école', 'La famille', 'La nourriture', 'Les loisirs', 'L’environnement'];

function PickVisual() {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      {TOPICS.map((t, i) => (
        <span
          key={t}
          lang="fr"
          className="text-xs font-medium px-3 py-1.5 rounded-full border"
          style={
            i === 0
              ? { borderColor: 'var(--mk-accent)', background: 'var(--mk-accent-soft)', color: 'var(--mk-ink)' }
              : { borderColor: 'var(--mk-hairline-strong)', color: 'var(--mk-ink-muted)' }
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function SpeakVisual() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: 'var(--mk-accent-strong)', color: '#fff' }}>
        <Mic size={17} />
      </span>
      <span className="mk-wave flex items-center gap-[3px] h-7">
        {[10, 20, 26, 14, 22, 8, 18, 24, 12, 20, 9, 16, 22, 11].map((h, i) => (
          <span key={i} style={{ height: h }} />
        ))}
      </span>
    </div>
  );
}

function FixVisual() {
  return (
    <p className="text-sm leading-relaxed" lang="fr" aria-hidden="true">
      <span className="mk-mark-bad line-through decoration-1">j’ai allé</span>
      <span style={{ color: 'var(--mk-ink-faint)' }}> → </span>
      <span className="mk-mark-good">je suis allé</span>
      <Check size={15} className="inline ml-2 -mt-0.5" style={{ color: 'var(--mk-good)' }} />
    </p>
  );
}

const STEPS: { n: string; title: string; body: string; visual: ReactNode }[] = [
  {
    n: '1',
    title: 'Pick a question',
    body: 'Choose a topic like holidays, school or family. When you feel ready, take a full mock exam instead.',
    visual: <PickVisual />,
  },
  {
    n: '2',
    title: 'Answer out loud',
    body: 'Tap the mic and speak, just like in the exam. Your answer is written out so you can see exactly what you said.',
    visual: <SpeakVisual />,
  },
  {
    n: '3',
    title: 'Fix it and go again',
    body: 'See what worked, what to fix first and a better way to say it. Then try again and feel the difference.',
    visual: <FixVisual />,
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps. One question at a time."
          intro="No setup, no textbooks. Just you, a question and your voice."
        />
      </Reveal>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {STEPS.map((step, i) => (
          <Reveal key={step.n} delayMs={i * 90}>
            <li className="mk-card rounded-3xl p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-sm font-semibold"
                  style={{ background: 'var(--mk-accent-soft)', color: 'var(--mk-accent)' }}
                  aria-hidden="true"
                >
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold">
                  <span className="sr-only">Step {step.n}: </span>
                  {step.title}
                </h3>
              </div>
              <p className="text-[15px] leading-relaxed mb-6" style={{ color: 'var(--mk-ink-muted)' }}>
                {step.body}
              </p>
              <div className="mt-auto pt-5 border-t mk-hairline min-h-[64px] flex items-center">{step.visual}</div>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
