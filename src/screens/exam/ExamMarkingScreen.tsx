import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Clock, MessageCircle, Mic, Scale } from 'lucide-react';
import { enter, enterReduced, stagger } from '../../components/motion/variants';
import { formatTime } from '../../domain/time';
import type { ExamFacts } from '../../features/exam/report/examReport';

/**
 * The wait between "Submit for marking" and the results. Every step shown is a
 * real phase of the scoring state machine (examScoringMachine.ts) — nothing is
 * a fake progress bar — and the numbers are facts read off the transcript the
 * candidate just finished, never a mark.
 */

export type MarkingStage = 'sending' | 'marking';

interface Props {
  title: string;
  detail: string;
  stage: MarkingStage;
  facts: ExamFacts | null;
  onExit: () => void;
}

type StepState = 'done' | 'active' | 'todo';

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-progress text-action-ink" aria-hidden="true">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-pill border-2 ${state === 'active' ? 'border-action' : 'border-hairline-strong'}`}
      aria-hidden="true"
    >
      {state === 'active' && <span className="h-2.5 w-2.5 rounded-pill bg-action" />}
    </span>
  );
}

export function ExamMarkingScreen({ title, detail, stage, facts, onExit }: Props) {
  const reduced = useReducedMotion() ?? false;
  const v = reduced ? enterReduced : enter;
  const [elapsedS, setElapsedS] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsedS(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const steps: { label: string; state: StepState }[] = [
    { label: 'Answers saved', state: 'done' },
    { label: 'Sent to the marker', state: stage === 'sending' ? 'active' : 'done' },
    { label: 'Marking the role play, communication and language', state: stage === 'marking' ? 'active' : 'todo' },
  ];

  const stats = facts
    ? [
        { icon: MessageCircle, value: `${facts.answers}`, label: facts.answers === 1 ? 'answer given' : 'answers given' },
        { icon: Clock, value: formatTime(Math.round(facts.speakingS)), label: 'minutes of speaking' },
        { icon: Mic, value: `${facts.words}`, label: 'words spoken' },
        { icon: Scale, value: `${facts.longestAnswerWords}`, label: 'words in your longest answer' },
      ]
    : [];

  return (
    <div data-hatch="immersive" className="min-h-screen bg-bg px-4 py-10">
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-md space-y-4">
        <motion.section variants={v} className="rounded-card border border-hairline bg-surface-raised p-5 shadow-card" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">Marking your exam</p>
              <h1 className="mt-1 text-title text-ink">{title}</h1>
              <p className="mt-1 text-body-s text-ink-muted">{detail}</p>
            </div>
            <span className="shrink-0 rounded-pill bg-track px-2.5 py-1 font-numeral text-label text-ink-muted" aria-label="Time waited">
              {formatTime(elapsedS)}
            </span>
          </div>

          <ol className="mt-5 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <StepIcon state={s.state} />
                <span className={`text-body-s ${s.state === 'todo' ? 'text-ink-subtle' : 'text-ink'} ${s.state === 'active' ? 'font-semibold' : ''}`}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        </motion.section>

        {stats.length > 0 && (
          <motion.section variants={v} className="rounded-card border border-hairline bg-surface p-5" aria-label="Your exam in numbers">
            <p className="text-eyebrow uppercase text-ink-subtle">While you wait: your exam in numbers</p>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {stats.map(({ icon: Icon, value, label }) => (
                <li key={label} className="rounded-control surface-recessed p-3">
                  <Icon size={16} className="text-action-text" aria-hidden="true" />
                  <p className="mt-1.5 font-numeral text-num-m leading-none text-ink">{value}</p>
                  <p className="mt-1 text-caption text-ink-muted">{label}</p>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        <motion.div variants={v} className="text-center">
          <button
            type="button"
            onClick={onExit}
            className="text-body-s text-ink-subtle underline underline-offset-2 transition-colors duration-state ease-smooth hover:text-ink"
          >
            Exit
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
