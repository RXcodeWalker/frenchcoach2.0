import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';
import { CtaButton } from '../../components/marketing/CtaButton';
import { SectionHeading } from './SectionHeading';

// Paper 3's structure and mark split (0520/03 Teacher's Notes; the same
// numbers live in src/domain/igcse/rubric.ts).
const PARTS = [
  { title: 'Role play', detail: 'Five tasks in an everyday situation, after a 10-minute prep.' },
  { title: 'Topic conversation 1', detail: 'A conversation on one topic, with follow-up questions.' },
  { title: 'Topic conversation 2', detail: 'A second topic, so you show your range.' },
];

// The sample report mirrors ExamResults: a /40 total and the three criteria.
const SAMPLE = [
  { label: 'Role play', mark: 8, max: 10 },
  { label: 'Communication', mark: 11, max: 15 },
  { label: 'Quality of language', mark: 10, max: 15 },
];

function SampleReport() {
  const total = SAMPLE.reduce((sum, row) => sum + row.mark, 0);
  return (
    <figure className="mk-card rounded-3xl p-6 m-0" aria-label={`Sample mock exam report: ${total} out of 40`}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <span className="mk-chip text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">Sample report</span>
          <p className="mt-3 text-base font-semibold">Mock exam</p>
        </div>
        <p className="font-display text-5xl leading-none">
          {total}
          <span className="text-lg" style={{ color: 'var(--mk-ink-faint)' }}>/40</span>
        </p>
      </div>
      <dl className="space-y-4">
        {SAMPLE.map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <dt style={{ color: 'var(--mk-ink-muted)' }}>{row.label}</dt>
              <dd className="font-semibold tabular-nums">
                {row.mark}<span style={{ color: 'var(--mk-ink-faint)' }}>/{row.max}</span>
              </dd>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--mk-hairline)' }} aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${(row.mark / row.max) * 100}%`, background: 'var(--mk-accent-strong)' }} />
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-6 rounded-2xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--mk-ink-faint)' }}>
          From your report
        </p>
        <p className="text-sm leading-relaxed">
          Quality of language: say <span className="mk-mark-good" lang="fr">je suis allé</span>, not{' '}
          <span className="mk-mark-bad" lang="fr">j’ai allé</span>.
        </p>
      </div>
    </figure>
  );
}

export function ExamPrep() {
  return (
    <Section id="exam">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <Reveal>
          <SectionHeading
            eyebrow="The exam"
            title="Built around Cambridge IGCSE French speaking."
            intro="Paper 3 is worth 40 marks. Full mock exams follow the same format and are marked against the Cambridge 0520 speaking criteria, so you know which part to work on next."
          />
          <ol className="space-y-3 -mt-4 mb-8">
            {PARTS.map((part, i) => (
              <li key={part.title} className="flex gap-4 py-3 border-b mk-hairline">
                <span className="font-display text-xl w-6 shrink-0" style={{ color: 'var(--mk-accent)' }} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{part.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--mk-ink-muted)' }}>{part.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <CtaButton href="/igcse-french-speaking" variant="secondary">Read the full exam guide</CtaButton>
        </Reveal>
        <Reveal delayMs={100}>
          <SampleReport />
        </Reveal>
      </div>
    </Section>
  );
}
