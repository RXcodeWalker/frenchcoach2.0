import type { ReactNode } from 'react';
import { Mic, Quote, ClipboardList, Gauge, Volume2, LineChart } from 'lucide-react';
import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { SectionHeading } from './SectionHeading';
import { LIMITS_COPY } from './landingContent';

// Each line maps to something the app does today:
// - quoted corrections: Learn drops any feedback that doesn't quote the answer
//   (domain/learn/feedback/filterCoachFeedback.ts)
// - level: the adaptive question picker (src/domain/learn/)
// - exam format + prep countdown: Exam Sim (RolePlayCardPreview's 600s timer)
// - examiner voice: ExamMode speaks every examiner line aloud
const BENEFITS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <Mic size={18} />,
    title: 'A daily speaking habit',
    body: `In class you might get a couple of turns a lesson. Here you get ${LIMITS_COPY}, whenever suits you.`,
  },
  {
    icon: <Quote size={18} />,
    title: 'Feedback on what you actually said',
    body: 'Every correction quotes your own words, so you know exactly which bit to change. Nothing vague, nothing made up.',
  },
  {
    icon: <Gauge size={18} />,
    title: 'Questions at your level',
    body: 'The next question is picked from how your answers are going, so it stays challenging without being impossible.',
  },
  {
    icon: <ClipboardList size={18} />,
    title: 'The real exam format',
    body: 'Mock exams follow Paper 3: a role play and two topic conversations, with a 10-minute prep countdown first.',
  },
  {
    icon: <Volume2 size={18} />,
    title: 'An examiner who talks back',
    body: 'In a mock exam the examiner asks each question out loud and waits for your answer, so the real thing feels familiar.',
  },
  {
    icon: <LineChart size={18} />,
    title: 'See yourself improve',
    body: 'Your scores and streak build up as you practise, so you can see the progress instead of guessing.',
  },
];

export function Benefits() {
  return (
    <Section id="why">
      <Reveal>
        <SectionHeading
          eyebrow="Why it works"
          title="Confidence comes from speaking. So you speak."
          intro="Most students know more French than they can say under pressure. The fix is practice out loud, with someone pointing out what to change."
        />
      </Reveal>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delayMs={(i % 3) * 80}>
            <li className="mk-card rounded-3xl p-6 h-full">
              <span aria-hidden="true" className="mk-icon-tile w-10 h-10 rounded-xl inline-flex items-center justify-center mb-5">
                {b.icon}
              </span>
              <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
                {b.body}
              </p>
            </li>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
