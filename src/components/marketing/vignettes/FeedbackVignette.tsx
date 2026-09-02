import { DeviceFrame } from '../DeviceFrame';

// Mirrors MarkedUpScript / CorrectionsCard: transcript with a highlighted
// span and its correction.
export function FeedbackVignette() {
  return (
    <DeviceFrame caption="Illustrative example — answer feedback">
      <p className="text-sm leading-relaxed mb-4">
        "Hier, je <span className="px-1 rounded" style={{ background: 'var(--mk-accent-soft)', color: 'var(--mk-accent)' }}>vais</span> au marché avec ma famille."
      </p>
      <div className="rounded-lg border mk-hairline p-3 text-xs leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--mk-ink)' }}>Correction: </span>
        "vais" describes a past event, so use the passé composé — "je <span className="font-semibold" style={{ color: 'var(--mk-good)' }}>suis allé(e)</span> au marché".
      </div>
    </DeviceFrame>
  );
}
