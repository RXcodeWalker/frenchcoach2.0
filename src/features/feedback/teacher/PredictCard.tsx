import { Loader2 } from 'lucide-react';
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

export function PredictCard({ checks, answers, onAnswer, phase, elapsedMs, register }: Props) {
  const line = preparingLine(phase, elapsedMs, register);
  return (
    <div className="rounded-xl surface-raised p-5 space-y-4" data-testid="predict-card">
      {checks.length > 0 && (
        <div className="space-y-3">
          <p className="text-eyebrow uppercase text-ink-muted">Predict your feedback</p>
          {checks.map((check) => (
            <div key={check.id} role="group" aria-label={check.prompt} className="flex items-center justify-between gap-3">
              <p className="text-xs text-ink">{check.prompt}</p>
              <div className="flex shrink-0 gap-1.5">
                {(['yes', 'no'] as const).map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={answers[check.id] === answer}
                    onClick={() => onAnswer(check.id, answer)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      answers[check.id] === answer ? 'bg-action text-action-ink' : 'surface-recessed text-ink-muted'
                    }`}
                  >
                    {answer === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <Loader2 size={14} className="text-action-text animate-spin shrink-0" aria-hidden="true" />
        <p className="text-xs text-ink-muted" role="status" aria-live="polite">
          {line}
        </p>
      </div>
    </div>
  );
}
