/**
 * The sentence frame of a question turn (junior-track §3): « J'aime ___. » with
 * the learner's chosen word filled in. Because they chose it, the app knows the
 * exact target sentence.
 */
import { SLOT_MARKER, slotText } from '../../data/junior/sentence';
import type { JuniorFrame, JuniorSlotOption } from '../../data/junior/types';

interface Props {
  frame: JuniorFrame;
  chosen: JuniorSlotOption | null;
}

export function SentenceFrame({ frame, chosen }: Props) {
  const [before, after = ''] = frame.template.split(SLOT_MARKER);
  return (
    <p data-testid="sentence-frame" lang="fr" className="text-title text-ink text-center">
      {before}
      <span
        data-testid="sentence-slot"
        className={chosen ? 'rounded-control bg-progress-soft px-1.5 font-bold text-progress-text' : 'border-b-2 border-hairline-strong px-4 text-ink-subtle'}
      >
        {chosen ? slotText(chosen) : ' '}
      </span>
      {after}
    </p>
  );
}
