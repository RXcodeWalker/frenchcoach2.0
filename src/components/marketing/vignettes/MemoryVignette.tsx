import { DeviceFrame } from '../DeviceFrame';

// Belief trend across four sessions — mirrors the shape of data produced by
// beliefReducer.ts's evidence-derived skill beliefs, not literal UI.
const SESSIONS = [
  { label: 'Session 1', value: 34 },
  { label: 'Session 2', value: 41 },
  { label: 'Session 3', value: 47 },
  { label: 'Session 4', value: 58 },
];

export function MemoryVignette() {
  const max = Math.max(...SESSIONS.map((s) => s.value));
  return (
    <DeviceFrame caption="Illustrative example — skill belief trend">
      <p className="text-xs font-semibold mb-4" style={{ color: 'var(--mk-ink-muted)' }}>
        Comparatives — mastery over time
      </p>
      <div className="flex items-end gap-3 h-24">
        {SESSIONS.map((s) => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full rounded-t"
              style={{ height: `${(s.value / max) * 100}%`, background: 'var(--mk-accent)', opacity: 0.85 }}
            />
            <span className="text-[9px]" style={{ color: 'var(--mk-ink-faint)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </DeviceFrame>
  );
}
