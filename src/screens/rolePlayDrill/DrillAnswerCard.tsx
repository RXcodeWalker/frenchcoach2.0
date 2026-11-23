import { motion, useReducedMotion } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import type { AnswerCheck } from '../../domain/rolePlayDrill/checkAnswer';

/** One exchange of a drill run: what was said (or not) and what the offline check found. */
export interface DrillExchange {
  /** 0-based task index. */
  step: number;
  /** `missed`: nothing was heard after the examiner asked again, so the exchange was skipped. */
  status: 'answered' | 'missed';
  transcript: string;
  check: AnswerCheck;
}

interface Props {
  exchange: DrillExchange;
  /** "Exchange 3" — the position on the card. */
  number: number;
  /** Offered while the answer can still be replaced (practice only, never under exam conditions). */
  canTryAgain: boolean;
  onTryAgain: () => void;
}

/**
 * The drill's compact coaching card for one exchange — nothing but what the
 * 0520 role play rewards: which parts of the task the answer communicated, the
 * short answer that would have covered them, and at most one tip. No mark, no
 * score, no vocabulary or style advice (a short answer that communicates fully
 * is complete — TN p.6). Computed offline by domain/rolePlayDrill/checkAnswer.ts.
 */
export function DrillAnswerCard({ exchange, number, canTryAgain, onTryAgain }: Props) {
  const reduced = useReducedMotion();
  const { check, status } = exchange;
  const missed = status === 'missed';

  return (
    <motion.article
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      aria-label={`Exchange ${number}`}
      data-testid={`drill-answer-card-${exchange.step}`}
      className="flex flex-col gap-3 rounded-card surface p-4"
    >
      <h3 className="text-eyebrow uppercase text-ink-subtle">Exchange {number}</h3>

      {missed ? (
        <p className="text-body-s text-ink-muted">No response.</p>
      ) : (
        <ul className="flex flex-col gap-1.5" aria-label="Parts of the question">
          {check.parts.map((part) => (
            <li key={part.label} className="flex items-center gap-2 text-body-s">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill ${part.found ? 'bg-progress-soft text-progress-text' : 'bg-correction-soft text-correction-text'}`}
                aria-hidden="true"
              >
                {part.found ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <span className="text-ink">
                {part.label}
                <span className="sr-only">{part.found ? ': covered' : ': not covered'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-0.5 rounded-control surface-recessed p-3">
        <span className="text-eyebrow uppercase text-ink-subtle">A 2-mark answer</span>
        <p lang="fr" className="exam-serif text-body-base text-ink">{check.modelShort}</p>
      </div>

      {!missed && check.tip && <p className="text-body-s text-ink-muted">{check.tip}</p>}

      {canTryAgain && (
        <div className="flex flex-col items-start gap-1">
          <Button variant="secondary" size="sm" onClick={onTryAgain}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </Button>
          <p className="text-caption text-ink-subtle">Practice only — in the exam you get one go.</p>
        </div>
      )}
    </motion.article>
  );
}
