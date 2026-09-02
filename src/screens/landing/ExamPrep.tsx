import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

export function ExamPrep() {
  return (
    <Section>
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="font-display text-3xl md:text-5xl leading-tight mb-6">
              Practice for the moment that matters.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              Cambridge IGCSE French (0520) Paper 3 Speaking is worth 40 marks: a role play with
              five transactional tasks, and two topic conversations marked for Communication and
              Quality of Language. Every band in the scorer traces to the published Teacher/
              Examiner Notes (0520/03/TN/M/J/24).
            </p>
          </div>
          <div className="lg:col-span-3 space-y-3">
            {[
              { label: 'Role Play — 5 tasks', marks: '10' },
              { label: 'Communication', marks: '15' },
              { label: 'Quality of Language', marks: '15' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm py-3 border-b mk-hairline">
                <span style={{ color: 'var(--mk-ink-muted)' }}>{row.label}</span>
                <span className="font-semibold">{row.marks} marks</span>
              </div>
            ))}
            <p className="text-xs leading-relaxed pt-2" style={{ color: 'var(--mk-ink-faint)' }}>
              Français AI is not affiliated with or endorsed by Cambridge Assessment International
              Education. It is an independent practice tool, not an official Cambridge product.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
              Planned: DELF practice. Not yet available.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
