import { useState } from 'react';
import { Check, Volume2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { NewsCheck } from '../../data/news/types';

interface Props {
  checks: readonly NewsCheck[];
  /** Replays the sentence that holds a missed answer. */
  onReplay: (sentence: number) => void;
  /** Called once every question has an answer, with how many were right first time. */
  onDone: (correct: number) => void;
}

/**
 * Step 2 (daily-news §3): three quick listening questions, marked instantly.
 * The first answer counts. A miss shows the right answer and offers the
 * sentence that holds it, so the check teaches rather than just tests.
 */
export function ComprehensionCheck({ checks, onReplay, onDone }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => checks.map(() => null));
  const allAnswered = answers.every(a => a !== null);
  const correct = answers.filter((a, i) => a === checks[i].answer).length;

  return (
    <div className="flex flex-col gap-5">
      {checks.map((c, qi) => {
        const picked = answers[qi];
        const answered = picked !== null;
        const right = picked === c.answer;
        return (
          <fieldset key={qi} className="flex flex-col gap-2" data-testid={`news-check-${qi}`}>
            <legend className="text-label text-ink">
              <span className="font-numeral text-ink-subtle">{qi + 1}.</span> {c.q}
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {c.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isAnswer = oi === c.answer;
                const tone = !answered
                  ? 'border-hairline-strong text-ink hover:bg-track'
                  : isAnswer
                    ? 'border-transparent bg-progress-soft text-progress-text'
                    : isPicked
                      ? 'border-transparent bg-correction-soft text-correction-text'
                      : 'border-hairline text-ink-subtle';
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={answered}
                    aria-pressed={isPicked}
                    onClick={() => setAnswers(prev => prev.map((a, i) => (i === qi ? oi : a)))}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-left text-body-s
                      transition-colors duration-state ease-smooth ${tone}`}
                  >
                    {answered && isAnswer && <Check size={16} aria-hidden="true" />}
                    {answered && isPicked && !isAnswer && <X size={16} aria-hidden="true" />}
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div role="status" className="flex flex-wrap items-center gap-2 text-body-s">
                {right ? (
                  <span className="text-progress-text">Right!</span>
                ) : (
                  <>
                    <span className="text-ink-muted">Not quite. The answer is in this sentence:</span>
                    <Button variant="quiet" size="sm" onClick={() => onReplay(c.sentence)}>
                      <Volume2 size={16} aria-hidden="true" /> Hear it again
                    </Button>
                  </>
                )}
              </div>
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-s text-ink-muted" aria-live="polite">
          {allAnswered ? (
            <>You got <span className="font-numeral text-ink">{correct}</span> of <span className="font-numeral">{checks.length}</span>.</>
          ) : (
            'Answer all three to continue.'
          )}
        </p>
        <Button size="lg" disabled={!allAnswered} onClick={() => onDone(correct)} data-testid="news-check-done">
          Now report it
        </Button>
      </div>
    </div>
  );
}
