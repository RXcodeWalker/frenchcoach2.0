/**
 * The 20-second guided demo before a learner's very first mission (junior-track
 * §1): Léo points at the pictures, then the sentence frame, then the mic — no
 * reading required, so it is icons and a sample question from the mission itself.
 * Shown once (`junior.demoSeen`); the screen marks it seen when it ends.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, Hand, Mic, PenLine } from 'lucide-react';
import { Button } from '../../components/ui/Button';
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

const CAPTION: Record<(typeof DEMO_STEPS)[number], { text: string; Icon: typeof Hand }> = {
  pictures: { text: 'Tap a picture', Icon: Hand },
  frame: { text: 'The sentence fills in', Icon: PenLine },
  mic: { text: 'Tap, then say it', Icon: Mic },
};

/** The step being pointed at gets an action outline set off from the card; nothing fades or moves. */
const stage = (on: boolean) =>
  `w-full rounded-card outline outline-2 outline-offset-4 transition-colors duration-state ease-smooth ${on ? 'outline-action' : 'outline-transparent'}`;

export function JuniorDemo({ sample, onDone }: Props) {
  const [step, setStep] = useState(0);
  const frame = sample.frames[0];
  const chosen = frame.slotOptions[0];
  const current = DEMO_STEPS[step];
  const last = step >= DEMO_STEPS.length - 1;
  const { text, Icon } = CAPTION[current];

  useEffect(() => {
    const id = setTimeout(() => {
      if (step >= DEMO_STEPS.length - 1) onDone();
      else setStep(step + 1);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [step, onDone]);

  const advance = () => (last ? onDone() : setStep(step + 1));

  return (
    <section data-testid="junior-demo" data-step={current} aria-label="How it works" className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <Leo state="happy" size="md" />
        <p role="status" className="flex items-center gap-2 text-subtitle text-ink">
          <Icon size={20} className="text-action-text" aria-hidden="true" /> {text}
        </p>
        <div aria-hidden="true" className="flex gap-1.5">
          {DEMO_STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 w-8 rounded-pill ${i <= step ? 'bg-action' : 'bg-track'}`} />
          ))}
        </div>
      </div>

      <div className={stage(current === 'pictures')}>
        <PictureChoices options={frame.slotOptions.slice(0, 4)} chosenId={step >= 1 ? chosen.id : null} showWords disabled onPick={() => {}} />
      </div>
      <div className={stage(current === 'frame')}>
        <SentenceFrame frame={frame} chosen={step >= 1 ? chosen : null} />
      </div>
      <div
        data-testid="demo-mic"
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full bg-action text-action-ink outline outline-2 outline-offset-4 ${current === 'mic' ? 'outline-action' : 'outline-transparent'}`}
      >
        <Mic size={30} aria-hidden="true" />
      </div>

      <Button type="button" size="lg" data-testid="demo-next" aria-label={last ? 'Start' : 'Next'} onClick={advance} className="min-w-[160px]">
        {last ? 'Start' : 'Next'} <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
