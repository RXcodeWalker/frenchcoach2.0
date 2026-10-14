/**
 * The 20-second guided demo before a learner's very first mission (junior-track
 * §1): Léo points at the pictures, then the sentence frame, then the mic — no
 * reading required, so it is icons and a sample question from the mission itself.
 * Shown once (`junior.demoSeen`); the screen marks it seen when it ends.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, Mic } from 'lucide-react';
import type { JuniorQuestion } from '../../data/junior/types';
import { DEMO_STEPS, STEP_MS } from './demoSteps';
import { Leo } from './Leo';
import { PictureChoices } from './PictureChoices';
import { SentenceFrame } from './SentenceFrame';

interface Props {
  /** A real question of the mission, used as the example. */
  sample: JuniorQuestion;
  onDone: () => void;
}

const CAPTION: Record<(typeof DEMO_STEPS)[number], string> = {
  pictures: '👇 Tap a picture',
  frame: '👆 The sentence fills in',
  mic: '🎙 Tap, then say it',
};

export function JuniorDemo({ sample, onDone }: Props) {
  const [step, setStep] = useState(0);
  const frame = sample.frames[0];
  const chosen = frame.slotOptions[0];
  const current = DEMO_STEPS[step];

  useEffect(() => {
    const id = setTimeout(() => {
      if (step >= DEMO_STEPS.length - 1) onDone();
      else setStep(step + 1);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [step, onDone]);

  const advance = () => (step >= DEMO_STEPS.length - 1 ? onDone() : setStep(step + 1));

  return (
    <section data-testid="junior-demo" data-step={current} aria-label="How it works" className="flex flex-col items-center gap-6">
      <Leo state="happy" size="md" />
      <p role="status" className="text-subtitle text-ink">{CAPTION[current]}</p>

      <div className={`w-full rounded-card p-3 ${current === 'pictures' ? 'ring-2 ring-action' : 'opacity-70'}`}>
        <PictureChoices options={frame.slotOptions.slice(0, 4)} chosenId={step >= 1 ? chosen.id : null} showWords disabled onPick={() => {}} />
      </div>
      <div className={`w-full rounded-card p-3 ${current === 'frame' ? 'ring-2 ring-action' : 'opacity-70'}`}>
        <SentenceFrame frame={frame} chosen={step >= 1 ? chosen : null} />
      </div>
      <div
        data-testid="demo-mic"
        className={`flex h-20 w-20 items-center justify-center rounded-full bg-action text-action-ink ${current === 'mic' ? 'ring-4 ring-action-soft motion-safe:animate-pulse' : 'opacity-60'}`}
      >
        <Mic size={32} aria-hidden="true" />
      </div>

      <button
        type="button"
        data-testid="demo-next"
        aria-label={step >= DEMO_STEPS.length - 1 ? 'Start' : 'Next'}
        onClick={advance}
        className="flex h-12 items-center gap-2 rounded-pill bg-action px-6 text-label text-action-ink"
      >
        <ArrowRight size={20} aria-hidden="true" />
      </button>
    </section>
  );
}
