import { DeviceFrame } from '../DeviceFrame';

const SKILLS = [
  { label: 'Passé composé agreement', pct: 31, color: 'var(--mk-bad)' },
  { label: 'Justify an opinion', pct: 57, color: 'var(--mk-ink-muted)' },
  { label: 'The French R', pct: 92, color: 'var(--mk-good)' },
];

export function MemoryVignette() {
  return (
    <DeviceFrame caption="Illustrative example — skill profile">
      <div className="space-y-3.5">
        {SKILLS.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--mk-ink-muted)' }}>{s.label}</span>
              <span className="font-semibold" style={{ color: s.color }}>{s.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--mk-hairline)' }}>
              <div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </DeviceFrame>
  );
}
