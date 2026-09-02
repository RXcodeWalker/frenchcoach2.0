import { DeviceFrame } from '../DeviceFrame';

// Mirrors SessionStartScreen / QuestionCard: a slot plan (docs §8.1 slot
// types) plus a real "why this question" line (docs §14.2), shown verbatim
// rather than a raw score.
const SLOTS = ['Warm-up', 'Review', 'Target', 'Stretch'];

export function AdaptiveVignette() {
  return (
    <DeviceFrame caption="Illustrative example — session plan">
      <div className="flex flex-wrap gap-2 mb-4">
        {SLOTS.map((slot) => (
          <span
            key={slot}
            className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border mk-hairline"
            style={{ color: 'var(--mk-ink-muted)' }}
          >
            {slot}
          </span>
        ))}
      </div>
      <div className="rounded-lg border mk-hairline p-3 text-xs leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--mk-ink)' }}>Why this question: </span>
        targets the comparative structures you found hardest last session, at a level just past
        where you're comfortable.
      </div>
    </DeviceFrame>
  );
}
