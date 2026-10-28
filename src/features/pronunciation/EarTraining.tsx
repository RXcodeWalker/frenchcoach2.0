import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { correct as correctMotion, enter, enterReduced } from '../../components/motion/variants';
import { buildEarRound, earFamilies, pairsFor, roundScoreLine, type EarQuestion } from '../../domain/pronunciation/lab/earTraining';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';
import { track } from '../../services/telemetry/telemetryService';
import { NATIVE_UNAVAILABLE } from './labCopy';
import { EAR_INTRO, earPrompt, earRoundSummary, earVerdictLine } from './soundsCopy';
import { useNativePlayer } from './useNativePlayer';

/**
 * Ear training (pronunciation-lab plan §3.3): the minimal-pair listening game.
 * One word of a pair is played and the learner picks which it was. Listen-only
 * — no microphone, no Azure, no request at all — and every word is a recorded
 * file, so it costs nothing and works signed out.
 *
 * Rounds are not stored (nothing to compare across sentences, no XP — owner
 * D4); the only trace is `ear_training_round {correct, total}` when a round is
 * finished. "Wrong" is never said: a miss plays both words side by side.
 */

interface Props {
  /** Start on one sound's pairs (from the guide); the learner can widen it. */
  initialFamily?: SoundFamilyId | 'all';
}

type Phase = { kind: 'asking' } | { kind: 'answered'; picked: string };

export function EarTraining({ initialFamily = 'all' }: Props) {
  const reduced = useReducedMotion() ?? false;
  const native = useNativePlayer();
  const [family, setFamily] = useState<SoundFamilyId | 'all'>(initialFamily);
  const [questions, setQuestions] = useState<EarQuestion[]>(() => buildEarRound(pairsFor(initialFamily)));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const [right, setRight] = useState(0);
  const reported = useRef(false);

  const finished = index >= questions.length && questions.length > 0;
  const question = questions[index] ?? null;

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      track({ name: 'ear_training_round', props: { correct: right, total: questions.length } });
    }
  }, [finished, right, questions.length]);

  const restart = (next: SoundFamilyId | 'all' = family) => {
    native.stop();
    reported.current = false;
    setFamily(next);
    setQuestions(buildEarRound(pairsFor(next)));
    setIndex(0);
    setRight(0);
    setPhase({ kind: 'asking' });
  };

  const pick = (word: string) => {
    if (!question || phase.kind !== 'asking') return;
    setPhase({ kind: 'answered', picked: word });
    if (word === question.answer) setRight((n) => n + 1);
  };

  const next = () => {
    native.stop();
    setIndex((i) => i + 1);
    setPhase({ kind: 'asking' });
  };

  const answered = phase.kind === 'answered';
  const wasRight = answered && question !== null && phase.picked === question.answer;

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-label="Ear training"
      data-testid="ear-training"
    >
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-action-text">Ear training</p>
        <h1 className="text-h1 text-ink">Which word did you hear?</h1>
        <p className="text-body-s text-ink-muted">{EAR_INTRO}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Sound">
        {(['all', ...earFamilies()] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={family === f}
            onClick={() => restart(f)}
            className={`h-10 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors duration-state ease-smooth
              ${family === f ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink hover:bg-track'}`}
          >
            {f === 'all' ? 'All sounds' : SOUND_TIPS[f].name}
          </button>
        ))}
      </div>

      {finished ? (
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface-raised p-5" role="status" data-testid="ear-summary">
          <p className="font-numeral text-title text-ink">{roundScoreLine(right, questions.length)}</p>
          <p className="text-body-s text-ink-muted">{earRoundSummary(right, questions.length)}</p>
          <Button onClick={() => restart()}>Another round</Button>
        </div>
      ) : question ? (
        <div className="flex flex-col gap-5 rounded-card border border-hairline bg-surface-raised p-5">
          <p className="text-caption text-ink-muted" aria-live="polite">{earPrompt(index, questions.length)}</p>
          <Button size="lg" onClick={() => void native.play(question.answer)} data-testid="ear-play">
            <Volume2 size={18} aria-hidden="true" /> {answered ? 'Play it again' : 'Play the word'}
          </Button>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Which word was it?">
            {question.options.map((word) => {
              const isAnswer = word === question.answer;
              const tone = !answered
                ? 'border-hairline-strong bg-surface text-ink hover:bg-track'
                : isAnswer
                  ? 'border-progress bg-progress-soft text-progress-text'
                  : phase.kind === 'answered' && phase.picked === word
                    ? 'border-hairline-strong bg-reward-soft text-reward-text'
                    : 'border-hairline bg-surface text-ink-muted';
              return (
                <button
                  key={word}
                  type="button"
                  disabled={answered}
                  onClick={() => pick(word)}
                  lang="fr"
                  data-testid={`ear-option-${word}`}
                  className={`flex h-16 items-center justify-center rounded-card border text-[20px] font-semibold transition-colors duration-state ease-smooth ${tone}`}
                >
                  {word}
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0.2 } : correctMotion.fix(0)}
              className="flex flex-col gap-3"
              role="status"
            >
              <p className={`text-body-s font-semibold ${wasRight ? 'text-progress-text' : 'text-ink'}`}>
                {earVerdictLine(wasRight, question.answer)}
              </p>
              <div className="flex flex-wrap gap-2">
                {question.options.map((word) => (
                  <Button key={word} variant="secondary" size="sm" onClick={() => void native.play(word)} aria-label={`Hear « ${word} »`}>
                    <Volume2 size={16} aria-hidden="true" /> <span lang="fr">{word}</span>
                  </Button>
                ))}
              </div>
              <Button onClick={next}>{index + 1 < questions.length ? 'Next' : 'See how it went'}</Button>
            </motion.div>
          )}
          {native.unavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
        </div>
      ) : (
        <p className="text-body-s text-ink-muted">There are no word pairs for this sound yet.</p>
      )}
    </motion.section>
  );
}
