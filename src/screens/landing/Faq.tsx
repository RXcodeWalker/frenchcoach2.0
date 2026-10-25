import { Plus } from 'lucide-react';
import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { SectionHeading } from './SectionHeading';
import { LANDING_FAQ } from './landingContent';

// Native <details>: keyboard and screen-reader support for free, works
// without JS, and every answer is in the static markup for crawlers. The
// FAQPage JSON-LD in src/config/seo.ts is built from the same LANDING_FAQ.
export function Faq() {
  return (
    <Section id="faq">
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        </Reveal>
        <Reveal delayMs={80}>
          <div className="border-t mk-hairline">
            {LANDING_FAQ.map((item) => (
              <details key={item.question} className="mk-faq border-b mk-hairline group">
                <summary className="flex items-center justify-between gap-6 py-5 min-h-[44px] text-base md:text-lg font-semibold rounded-md">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="mk-faq-icon w-8 h-8 shrink-0 rounded-full border mk-hairline-strong inline-flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </span>
                </summary>
                <p className="pb-6 pr-12 text-[15px] leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
