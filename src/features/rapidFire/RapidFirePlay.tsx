import { useEffect, useReducer, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Heart, Pause, Play, Timer, Zap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { PageShell } from '../../components/layout/PageShell';
import { useHideDock } from '../../components/layout/shellChrome';
import { enter, enterReduced } from '../../components/motion/variants';
import { useBackHandler } from '../../lib/useBackHandler';
import { useCountdown } from '../minigames/hooks/useCountdown';
import { CorrectionReveal } from './CorrectionReveal';
import {
  BONUS_EVERY,
  BONUS_SECONDS,
  RUN_SECONDS,
  START_HEARTS,
  TIME_PENALTY,
  createRun,
  multiplierFor,
  runReducer,
  summarise,
  type Feedback,
  type RunMode,
  type RunSummary,
} from './run';
import type { RapidFireWord } from './wordBank';

interface Props {
  words: RapidFireWord[];
  mode: RunMode;
  onFinish: (summary: RunSummary) => void;
}

/** How long a correction stays up before the next word, unless the learner presses Enter. */
const CORRECT_MS = 450;
const MISS_MS = 1800;

function HeartRow({ hearts }: { hearts: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${hearts} of ${START_HEARTS} hearts left`}>
      {Array.from({ length: START_HEARTS }, (_, i) => (
        <Heart
          key={i}
          size={20}
          aria-hidden="true"
          className={`transition-colors duration-state ease-smooth ${i < hearts ? 'fill-correction text-correction' : 'text-ink-subtle'}`}
        />
      ))}
    </div>
  );
}

function FeedbackLine({ fb }: { fb: Feedback }) {
  const chips: Array<{ text: string; good: boolean }> = [];
  if (fb.kind === 'correct') {
    chips.push({ text: `+${fb.points}`, good: true });
    if (fb.timeDelta > 0) chips.push({ text: `+${fb.timeDelta}s`, good: true });
    if (fb.heartBack) chips.push({ text: 'Heart back', good: true });
  } else if (fb.kind === 'wrong') {
    chips.push({ text: '−1 heart', good: false }, { text: `−${-fb.timeDelta}s`, good: false });
  } else if (fb.kind === 'skipped') {
    chips.push({ text: `−${-fb.timeDelta}s`, good: false });
  } else {
    chips.push({ text: 'No penalty', good: false });
  }

  const heading =
    fb.kind === 'correct' ? { text: 'Correct', tone: 'text-progress-text' }
    : fb.kind === 'almost' ? { text: 'Almost. Check the spelling', tone: 'text-info-text' }
    : fb.kind === 'skipped' ? { text: 'Skipped', tone: 'text-ink-muted' }
    : { text: 'Not quite', tone: 'text-correction-text' };

  return (
    <div className="flex flex-col gap-1.5" data-testid={`rf-feedback-${fb.kind}`}>
      <div className="flex flex-wrap items-center gap-2">
        {fb.kind === 'correct' && <Check size={16} aria-hidden="true" className="text-progress-text" />}
        <span className={`text-label ${heading.tone}`}>{heading.text}</span>
        {chips.map(c => (
          <Stat key={c.text} role={c.good ? 'progress' : 'neutral'} soft={c.good}>{c.text}</Stat>
        ))}
      </div>
      {fb.kind === 'correct' ? (
        fb.accentsMissed && (
          <p className="text-body-s text-ink-muted">
            With accents: <span lang="fr" className="font-semibold text-ink">{fb.expected}</span>
          </p>
        )
      ) : (
        <p className="text-title text-ink"><CorrectionReveal typed={fb.typed} fix={fb.expected} /></p>
      )}
    </div>
  );
}

/**
 * One run: a 3-2-1, then the sprint. The run's rules live in `run.ts`; this
 * component owns the clock, the focus and the keyboard (Enter checks or moves
 * on, Escape pauses). It never reads or writes app state: Rapid Fire awards no
 * XP and records no session.
 */
export function RapidFirePlay({ words, mode, onFinish }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  useHideDock(true);

  const [state, dispatch] = useReducer(runReducer, undefined, () => createRun(words, mode));
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  const countdown = useCountdown({ from: 3, intervalMs: 800, active: true, onComplete: () => setStarted(true) });

  const running = started && state.phase === 'playing';
  const fb = state.feedback;

  // The clock: one tick a second. The reducer ignores ticks while paused or while a correction is up.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Switching tabs pauses the run rather than letting the clock decide it.
  useEffect(() => {
    if (!running) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause' });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [running]);

  // A correction moves on by itself; Enter (or Next) moves on sooner.
  useEffect(() => {
    if (!fb) return;
    const id = setTimeout(() => dispatch({ type: 'advance' }), fb.kind === 'correct' ? CORRECT_MS : MISS_MS);
    return () => clearTimeout(id);
  }, [fb]);

  useEffect(() => {
    if (state.phase === 'done' && !finished.current) {
      finished.current = true;
      onFinish(summarise(state));
    }
  }, [state, onFinish]);

  // A fresh word clears the box and takes focus.
  useEffect(() => {
    if (!running || fb || state.paused) return;
    setValue('');
    inputRef.current?.focus();
  }, [running, fb, state.paused, state.current.id]);

  // Escape never leaves mid-run: it pauses, and pressing it again resumes.
  useBackHandler(() => {
    if (running) dispatch({ type: state.paused ? 'resume' : 'pause' });
    return true;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fb) {
      if (fb.kind !== 'correct') dispatch({ type: 'advance' });
      return;
    }
    dispatch({ type: 'answer', input: value });
  };

  if (!started) {
    return (
      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} className="flex min-h-[360px] flex-col items-center justify-center rounded-card border border-hairline bg-surface p-8 text-center" aria-live="polite">
          <p className="text-eyebrow uppercase text-ink-subtle">Get ready</p>
          <motion.p
            key={countdown.value}
            variants={item}
            initial="hidden"
            animate="show"
            className="mt-4 font-numeral text-display text-ink"
            data-testid="rf-countdown"
          >
            {countdown.value}
          </motion.p>
          <p className="mt-4 text-body-s text-ink-muted">Type the French, then press Enter.</p>
        </motion.section>
      </PageShell>
    );
  }

  const critical = state.timeLeft <= 10;
  const multiplier = multiplierFor(state.streak);
  const untilBonus = BONUS_EVERY - (state.streak % BONUS_EVERY);
  const inputTone =
    fb?.kind === 'correct' ? 'border-progress bg-progress-soft'
    : fb?.kind === 'wrong' ? 'border-correction bg-correction-soft'
    : fb ? 'border-hairline-strong bg-surface-recessed'
    : 'border-hairline-strong bg-surface focus:border-action';

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-4 md:p-5" aria-label="Run status">
        <div className="flex items-center justify-between gap-3">
          <HeartRow hearts={state.hearts} />
          <div className="flex flex-col items-center">
            <span className="text-caption text-ink-subtle">Points</span>
            <span className="font-numeral text-num-m text-ink" data-testid="rf-score">{state.score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 font-numeral text-num-m ${critical ? 'text-correction-text' : 'text-ink'}`} data-testid="rf-time">
              <Timer size={18} aria-hidden="true" />
              {state.timeLeft}s
            </span>
            <Button
              variant="secondary"
              size="sm"
              aria-label={state.paused ? 'Resume run' : 'Pause run'}
              onClick={() => dispatch({ type: state.paused ? 'resume' : 'pause' })}
              className="!px-0 w-10"
            >
              {state.paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            </Button>
          </div>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-pill bg-track"
          role="progressbar"
          aria-label="Time left"
          aria-valuemin={0}
          aria-valuemax={RUN_SECONDS}
          aria-valuenow={Math.min(RUN_SECONDS, state.timeLeft)}
        >
          <div
            className={`h-full rounded-pill transition-[width,background-color] duration-[1000ms] ease-linear motion-reduce:transition-none ${critical ? 'bg-correction' : 'bg-progress'}`}
            style={{ width: `${Math.max(0, Math.min(1, state.timeLeft / RUN_SECONDS)) * 100}%` }}
          />
        </div>

        <div className="mt-3 flex min-h-7 items-center justify-between gap-3">
          <div className="flex items-center gap-2" data-testid="rf-combo">
            {state.streak >= 2 && (
              <motion.span key={state.streak} variants={item} initial="hidden" animate="show" className="flex items-center gap-2">
                <Stat role="progress" soft icon={<Zap size={14} />}>{state.streak} in a row</Stat>
                {multiplier > 1 && <Stat role="progress">×{multiplier}</Stat>}
              </motion.span>
            )}
          </div>
          <span className="text-caption text-ink-subtle">
            {untilBonus} more for +{BONUS_SECONDS}s
          </span>
        </div>
      </motion.section>

      {state.paused ? (
        <motion.section variants={item} className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-card border border-hairline bg-surface p-8 text-center">
          <p className="text-title text-ink">Paused</p>
          <p className="text-body-s text-ink-muted">Your clock is stopped. Escape also resumes.</p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button size="lg" onClick={() => dispatch({ type: 'resume' })}>Resume</Button>
            <Button variant="secondary" size="lg" onClick={() => dispatch({ type: 'quit' })}>End run</Button>
          </div>
        </motion.section>
      ) : (
        <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8">
          <p className="text-eyebrow uppercase text-ink-subtle">{mode === 'drill' ? 'Missed word' : 'Translate to French'}</p>
          <motion.h2
            key={state.current.id}
            variants={item}
            initial="hidden"
            animate="show"
            className="mt-3 text-display-m text-ink [overflow-wrap:anywhere] md:text-h1"
            data-testid="rf-prompt"
          >
            {state.current.prompt}
          </motion.h2>

          <div role="status" aria-live="polite" className="mt-4 min-h-[64px]">
            {fb ? (
              <FeedbackLine fb={fb} />
            ) : (
              <p className="text-caption text-ink-subtle">Wrong answers cost a heart and {TIME_PENALTY}s. Skip costs {TIME_PENALTY}s.</p>
            )}
          </div>

          <form onSubmit={submit} className="mt-2 flex flex-col gap-3" autoComplete="off">
            <label htmlFor="rf-answer" className="sr-only">Your French translation</label>
            <input
              id="rf-answer"
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              readOnly={!!fb}
              lang="fr"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="Type the French"
              className={`h-14 w-full rounded-control border px-4 text-title text-ink outline-none placeholder:text-ink-subtle
                transition-colors duration-state ease-smooth ${inputTone}`}
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={fb ? fb.kind === 'correct' : value.trim().length === 0}
                data-testid="rf-check"
              >
                {fb && fb.kind !== 'correct' ? <>Next <ArrowRight size={16} aria-hidden="true" /></> : 'Check'}
              </Button>
              <Button type="button" variant="secondary" size="lg" disabled={!!fb} onClick={() => dispatch({ type: 'skip' })} data-testid="rf-skip">
                Skip
              </Button>
            </div>
          </form>
        </motion.section>
      )}
    </PageShell>
  );
}
