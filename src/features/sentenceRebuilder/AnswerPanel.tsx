import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Lightbulb, Route } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { correct, enter, enterReduced } from '../../components/motion/variants';
import type { SentenceState } from './engine';
import { HearButton } from './HearButton';

interface Props {
  sentence: SentenceState;
  speed: boolean;
  last: boolean;
  onNext: () => void;
}

function headline(s: SentenceState): { title: string; detail: string } {
  if (s.outcome === 'clean') return { title: 'Correct', detail: 'First try, no hints.' };
  if (s.outcome === 'solved') {
    const tries = s.attempts === 1 ? 'first try' : `try ${s.attempts}`;
    const helped = s.hints > 0 ? ` with ${s.hints} ${s.hints === 1 ? 'hint' : 'hints'}` : '';
    return { title: 'Correct', detail: `Got it on ${tries}${helped}.` };
  }
  return { title: s.outcome === 'skipped' ? 'Skipped' : 'Here is the sentence', detail: '' };
}

/**
 * What shows once a sentence is settled: the French (with a voice), the
 * meaning, and why the words go where they do. After a miss the wrong try is
 * struck through and the right sentence drops in (the `correct` motion).
 */
export function AnswerPanel({ sentence, speed, last, onNext }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { question: q, outcome } = sentence;
  const solved = outcome === 'clean' || outcome === 'solved';
  const { title, detail } = headline(sentence);
  const wrong = sentence.lastWrong?.join(' ') ?? null;
  const dropIn = wrong !== null && !reduced;

  return (
    <motion.section
      variants={item}
      initial="hidden"
      animate="show"
      className="rounded-card border border-hairline bg-surface p-5 shadow-card"
      data-testid="rebuilder-answer"
      data-outcome={outcome ?? ''}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 items-center justify-center rounded-pill ${solved ? 'bg-progress-soft text-progress-text' : 'bg-surface-recessed text-ink-muted'}`}
          >
            {solved ? <Check size={16} /> : <Route size={16} />}
          </span>
          <h2 className={`text-section ${solved ? 'text-progress-text' : 'text-ink'}`}>{title}</h2>
        </div>
        {solved && <Stat soft>+{sentence.points} pts</Stat>}
      </div>
      {detail && <p className="mt-1 text-[14px] text-ink-muted">{detail}</p>}

      {wrong !== null && (
        <p className="mt-3 text-[14px] text-ink-subtle">
          <span className="mr-1.5">You wrote</span>
          <span className="relative inline-block text-correction-text" lang="fr">
            {wrong}
            <motion.span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-[2px] w-full origin-left bg-correction"
              initial={dropIn ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={correct.strike(0)}
            />
          </span>
        </p>
      )}

      <motion.div
        className="mt-3 flex items-start justify-between gap-2"
        initial={dropIn ? { opacity: 0, y: -8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={correct.fix(0)}
      >
        <div className="min-w-0">
          <p className="text-[22px] font-semibold leading-[1.3] text-ink" lang="fr" data-testid="rebuilder-french">
            {q.french}
          </p>
          <p className="mt-1 text-[15px] text-ink-muted" lang="en">{q.english}</p>
        </div>
        <HearButton text={q.french} label="Hear the sentence" showLabel />
      </motion.div>

      <div className="mt-4 flex gap-3 rounded-control bg-surface-recessed p-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-info-soft text-info-text">
          <Lightbulb size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-ink-subtle">Why it works · {q.theme}</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-ink">{q.explanation}</p>
        </div>
      </div>

      {!solved && !speed && !sentence.repeat && (
        <p className="mt-3 text-[13px] text-ink-subtle">This one comes back once more before the round ends.</p>
      )}

      <div className="mt-4">
        <Button size="lg" onClick={onNext} autoFocus className="w-full sm:w-auto sm:min-w-[200px]" data-testid="rebuilder-next">
          {last ? 'See results' : 'Next sentence'}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </motion.section>
  );
}
