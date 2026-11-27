import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { enter, enterReduced, stagger } from '../../../components/motion/variants';
import type { PredictionAnswer, PredictionCheck, PredictionCheckId } from './predictionQuestions';
import { preparingLine, type PreparingPhase } from './preparingLines';
import type { TeacherRegister } from './persona';

/**
 * "Predict your feedback" (Learn feedback Batch 6b): the wait is spent on up to
 * two one-tap yes/no self-checks drawn from what the question asks for, with one
 * small status line under them that follows the REAL stream phase.
 *
 * Answering is optional and never blocks anything. The answers are held by the
 * caller as session state — never stored, never a belief input. When the
 * feedback lands, each answer can earn one calibration line (see
 * predictionQuestions.ts).
 */

interface Props {
  checks: readonly PredictionCheck[];
  answers: Partial<Record<PredictionCheckId, PredictionAnswer>>;
  onAnswer: (id: PredictionCheckId, answer: PredictionAnswer) => void;
  phase: PreparingPhase;
  elapsedMs: number;
  register: TeacherRegister;
}

/** The two real stages the stream reports. Nothing is invented between them. */
const STEPS = [
  { phase: 'transcribing', coach: 'Listening back', examiner: 'Transcribing' },
  { phase: 'generating', coach: 'Reading your answer', examiner: 'Reviewing' },
] as const;

function stepState(i: number, phase: PreparingPhase): 'done' | 'current' | 'todo' {
  const at = phase === 'generating' ? 1 : phase === 'transcribing' ? 0 : phase === 'complete' ? 2 : -1;
  return i < at ? 'done' : i === at ? 'current' : 'todo';
}

export function PredictCard({ checks, answers, onAnswer, phase, elapsedMs, register }: Props) {
  const reduced = useReducedMotion() ?? false;
  const line = preparingLine(phase, elapsedMs, register);
  const answered = checks.filter((c) => answers[c.id]).length;
  const item = reduced ? enterReduced : enter;
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3" data-testid="predict-card">
      <motion.section
        variants={item}
        aria-label="Preparing your feedback"
        className="rounded-card border border-hairline bg-surface-raised p-4 shadow-card sm:p-5"
      >
        <p className="text-section text-ink">{register === 'coach' ? 'Your feedback is on its way' : 'Your answer is being reviewed'}</p>
        <ol className="mt-3 grid grid-cols-2 gap-2" aria-hidden="true">
          {STEPS.map((step, i) => {
            const state = stepState(i, phase);
            return (
              <li key={step.phase} className="space-y-1.5">
                <span className="block h-1.5 overflow-hidden rounded-pill bg-track">
                  <motion.span
                    className="block h-full rounded-pill bg-action"
                    initial={false}
                    animate={{ width: state === 'done' ? '100%' : state === 'current' ? '50%' : '0%' }}
                    transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                <span className={`flex items-center gap-1 text-caption ${state === 'todo' ? 'text-ink-subtle' : 'text-ink'}`}>
                  {state === 'done' && <Check size={12} className="text-progress-text" />}
                  {register === 'coach' ? step.coach : step.examiner}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 min-h-[1.25rem] text-body-s text-ink-muted" role="status" aria-live="polite">
          {line}
        </p>
      </motion.section>

      {checks.length > 0 && (
        <motion.section variants={item} aria-label="Predict your feedback" className="rounded-card border border-hairline bg-surface p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-section text-ink">Predict your feedback</p>
              <p className="mt-0.5 text-caption text-ink-muted">
                {register === 'coach' ? "Tap Yes or No. I'll tell you if you were right." : 'Answer if you wish; each prediction is checked.'}
              </p>
            </div>
            <span className="shrink-0 rounded-pill bg-track px-2 py-0.5 font-numeral text-caption text-ink-muted">
              {answered} of {checks.length}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-hairline">
            {checks.map((check) => (
              <li key={check.id} role="group" aria-label={check.prompt} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <p className="text-body-s text-ink">{check.prompt}</p>
                <div className="flex shrink-0 gap-1.5">
                  {(['yes', 'no'] as const).map((answer) => {
                    const on = answers[check.id] === answer;
                    return (
                      <button
                        key={answer}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onAnswer(check.id, answer)}
                        className={`min-w-[3.25rem] rounded-control border px-3 py-2 text-label transition-colors duration-state active:scale-[.97] ${
                          on ? 'border-action bg-action text-action-ink' : 'border-hairline bg-surface text-ink-muted hover:bg-surface-recessed'
                        }`}
                      >
                        {answer === 'yes' ? 'Yes' : 'No'}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </motion.div>
  );
}
