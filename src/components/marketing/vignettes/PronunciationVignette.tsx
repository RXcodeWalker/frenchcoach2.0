import { DeviceFrame } from '../DeviceFrame';

// Mirrors PronunciationHeatMap's word-level colour scale — same three
// status colours as STATUS_CLASS (emerald/amber/red).
const WORDS: { word: string; status: 'good' | 'amber' | 'bad' }[] = [
  { word: 'Je', status: 'good' },
  { word: 'voudrais', status: 'good' },
  { word: 'réserver', status: 'amber' },
  { word: 'une', status: 'good' },
  { word: 'chambre', status: 'bad' },
  { word: 'pour', status: 'good' },
  { word: 'deux', status: 'good' },
  { word: 'nuits.', status: 'amber' },
];

const COLOR: Record<(typeof WORDS)[number]['status'], string> = {
  good: 'var(--mk-good)',
  amber: 'var(--mk-ink-muted)',
  bad: 'var(--mk-bad)',
};

export function PronunciationVignette() {
  return (
    <DeviceFrame caption="Illustrative example — pronunciation heat map">
      <p className="text-sm leading-loose flex flex-wrap gap-x-1.5">
        {WORDS.map((w, i) => (
          <span key={i} style={{ color: COLOR[w.status] }}>
            {w.word}
          </span>
        ))}
      </p>
    </DeviceFrame>
  );
}
