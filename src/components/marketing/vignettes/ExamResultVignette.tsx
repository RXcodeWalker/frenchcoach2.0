import { DeviceFrame } from '../DeviceFrame';

// Mirrors src/screens/exam/ExamResults.tsx: /40 total, per-criterion mark +
// band label, the real "Marks — Unvalidated Estimate" note, one guardrail line.
export function ExamResultVignette() {
  return (
    <DeviceFrame caption="Illustrative example — Exam Results screen">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold">Practice Session Complete</p>
        <p className="text-2xl font-display" style={{ color: 'var(--mk-accent)' }}>
          27<span className="text-sm" style={{ color: 'var(--mk-ink-faint)' }}>/40</span>
        </p>
      </div>

      <div className="space-y-2.5">
        {[
          { label: 'Role-Play (A)', mark: '9 (8–10)' },
          { label: 'Communication', mark: '11 (10–12)' },
          { label: 'Quality of Language', mark: '7 (7–9)' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs py-2 border-b mk-hairline last:border-b-0">
            <span style={{ color: 'var(--mk-ink-muted)' }}>{row.label}</span>
            <span className="font-semibold">{row.mark}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--mk-ink-faint)' }}>
        Marks — Unvalidated Estimate. This score has never been checked against a real examiner.
        Treat it as a rough signal, not a grade prediction.
      </p>
    </DeviceFrame>
  );
}
