import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, Heart, Pause } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { correct, fill, streakFlame } from '../../components/motion/variants';
import { FLOOR_Y, HINT_Y, MAX_LIVES, WAVE_SIZE, hintText, multiplierFor, type FallingWord, type GameEvent, type GameState, type SubmitResult } from './engine';
import { lockedTarget, normalizeAnswer, typedLanguage } from './matching';

interface Props {
  game: GameState;
  onType: (text: string, mode: 'live' | 'enter') => SubmitResult;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

const TOAST_MS = 1500;

/**
 * The play screen (Design System v2): a score/wave/lives row, the field the
 * words fall through, and the answer box. Colour carries meaning — the word you
 * are typing towards is outlined in action, a word about to land turns
 * correction, a catch shows its answer in progress. No glow, no screen shake:
 * the only movement is the fall itself and the named `correct` / `streak` motions.
 */
export function PlayField({ game, onType, onPause, onResume, onEnd }: Props) {
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const [toast, setToast] = useState<{ seq: number; text: string } | null>(null);

  const { settings, phase } = game;
  const language = typedLanguage(settings.direction);
  const playing = phase === 'playing';
  const lanes = settings.lanes;
  const multiplier = multiplierFor(game.combo);

  useEffect(() => {
    if (playing) inputRef.current?.focus();
  }, [playing]);

  // Wave-ups and hearts won back get a short toast over the field.
  const event = game.event;
  useEffect(() => {
    if (!event) return;
    const text = toastFor(event);
    if (!text) return;
    setToast({ seq: event.seq, text });
    const t = window.setTimeout(() => setToast(cur => (cur?.seq === event.seq ? null : cur)), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [event]);

  const typed = normalizeAnswer(value, language);
  const locked = lockedTarget(
    game.words.map(w => ({ ...w, accept: w.word.accept })),
    typed,
  );

  const onChange = (next: string) => {
    setValue(next);
    setWrong(false);
    if (onType(next, 'live') === 'cleared') setValue('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const result = onType(value, 'enter');
    if (result === 'cleared') {
      setValue('');
      setWrong(false);
    } else if (result === 'wrong') {
      setWrong(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-5">
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">Score</p>
            <p className="font-numeral text-[28px] leading-[1.15] text-ink" data-testid="word-drop-score">{game.score}</p>
          </div>
          <div className="min-w-[96px] pb-1.5">
            <p className="text-[13px] font-semibold text-ink-muted">Wave {game.wave}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-track" aria-hidden="true">
              <motion.div
                className="h-full rounded-pill bg-progress"
                initial={false}
                animate={{ width: `${(game.clearedInWave / WAVE_SIZE) * 100}%` }}
                transition={reduced ? { duration: 0 } : fill(0)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pb-1">
          <div className="flex items-center gap-1" role="img" aria-label={`${game.lives} of ${MAX_LIVES} lives left`}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <Heart
                key={i}
                size={20}
                aria-hidden="true"
                className={i < game.lives ? 'fill-correction text-correction' : 'text-ink-subtle'}
              />
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={onPause} aria-label="Pause">
            <Pause size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Pause</span>
          </Button>
        </div>
      </div>

      <div
        role="group"
        aria-label="Falling words"
        onPointerDown={() => inputRef.current?.focus()}
        className="relative h-[clamp(320px,54dvh,520px)] overflow-hidden rounded-card border border-hairline bg-surface-recessed"
      >
        <div className="absolute right-3 top-3 z-10">
          {game.combo >= 2 ? (
            <Stat
              role="streak"
              icon={
                <motion.span key={multiplier} className="inline-flex" animate={reduced ? undefined : streakFlame}>
                  <Flame size={14} />
                </motion.span>
              }
            >
              {game.combo} in a row{multiplier > 1 ? ` · ×${multiplier}` : ''}
            </Stat>
          ) : null}
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.seq}
              className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
            >
              <span className="rounded-pill border border-progress bg-surface px-3 py-1 text-[13px] font-semibold text-progress-text">
                {toast.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {game.words.map(card => (
          <FallingCard key={card.uid} card={card} lanes={lanes} reduced={Boolean(reduced)} language={settings.direction === 'fr-en' ? 'fr' : 'en'} locked={locked?.uid === card.uid} />
        ))}

        {game.ghosts.map(g => (
          <div
            key={g.uid}
            className="pointer-events-none absolute flex -translate-y-1/2 justify-center px-1"
            style={{ left: `${(g.lane * 100) / lanes}%`, width: `${100 / lanes}%`, top: `${reduced ? Math.round(g.y / 7) * 7 : g.y}%` }}
          >
            <motion.span
              className="max-w-full rounded-control border border-progress bg-progress-soft px-2.5 py-1.5 text-center text-[16px] font-semibold leading-tight text-progress-text md:text-[18px]"
              lang={settings.direction === 'fr-en' ? 'en' : 'fr'}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: reduced ? 0 : -10 }}
              transition={{ duration: 0.6, ease: [0.2, 0, 0.2, 1] }}
            >
              {g.text}
            </motion.span>
          </div>
        ))}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-11 items-center justify-center border-t border-correction bg-correction-soft px-3"
          aria-hidden="true"
        >
          <AnimatePresence mode="wait">
            {game.miss && <MissNote key={game.miss.uid} text={game.miss.text} answer={game.miss.answer} direction={settings.direction} reduced={Boolean(reduced)} />}
          </AnimatePresence>
        </div>

        {phase === 'paused' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-scrim p-4">
            <div role="dialog" aria-label="Paused" className="surface-raised w-full max-w-[320px] rounded-card p-5 text-center shadow-overlay">
              <p className="text-title text-ink">Paused</p>
              <p className="mt-1 text-[14px] text-ink-muted">Your words are waiting. Nothing falls while you pause.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button size="lg" onClick={onResume} autoFocus>Resume</Button>
                <Button variant="secondary" size="md" onClick={onEnd}>End game</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!playing}
          lang={language}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label={language === 'en' ? 'Type the English meaning' : 'Type the French word'}
          placeholder={language === 'en' ? 'Type the English meaning' : 'Type the French word'}
          className={`h-12 w-full rounded-control border bg-surface px-4 text-[16px] font-semibold text-ink placeholder:font-normal placeholder:text-ink-subtle
            transition-colors duration-state ease-smooth disabled:bg-track disabled:text-ink-subtle
            ${wrong ? 'border-correction' : 'border-hairline-strong focus:border-action'}`}
        />
        <p className={`mt-2 min-h-[18px] text-[13px] ${wrong ? 'text-correction-text' : 'text-ink-subtle'}`}>
          {wrong ? 'Not quite. Keep going.' : (
            <>
              Words clear as you type them.
              <span className="hidden md:inline"> Enter checks a close spelling. Esc pauses.</span>
            </>
          )}
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announce(game)}</p>
    </div>
  );
}

function FallingCard({ card, lanes, reduced, language, locked }: { card: FallingWord; lanes: number; reduced: boolean; language: 'fr' | 'en'; locked: boolean }) {
  const y = reduced ? Math.round(card.y / 7) * 7 : card.y;
  const landing = card.y >= FLOOR_Y - 20;
  const tone = locked
    ? 'border-action bg-action-soft text-action-text'
    : landing
      ? 'border-correction bg-surface text-correction-text'
      : 'border-hairline-strong bg-surface text-ink';
  const hint = hintText(card);
  return (
    <div
      className="pointer-events-none absolute flex -translate-y-1/2 justify-center px-1"
      style={{ left: `${(card.lane * 100) / lanes}%`, width: `${100 / lanes}%`, top: `${y}%` }}
    >
      <motion.div
        className="flex max-w-full flex-col items-center gap-0.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
      >
        {card.again && (
          <span className="rounded-pill bg-reward-soft px-2 text-[12px] font-semibold leading-5 text-reward-text">Again</span>
        )}
        <span
          lang={language}
          className={`max-w-full rounded-control border px-2.5 py-1.5 text-center text-[16px] font-semibold leading-tight shadow-card transition-colors duration-state ease-smooth md:text-[18px] ${tone}`}
        >
          {card.word.text}
        </span>
        {hint && y >= HINT_Y && (
          <span aria-hidden="true" className="font-numeral text-[12px] tracking-[0.2em] text-ink-subtle">{hint}</span>
        )}
      </motion.div>
    </div>
  );
}

/** The `correct` motion on the floor: the missed word is struck through, then its answer drops in. */
function MissNote({ text, answer, direction, reduced }: { text: string; answer: string; direction: 'fr-en' | 'en-fr'; reduced: boolean }) {
  const shownLang = direction === 'fr-en' ? 'fr' : 'en';
  const answerLang = direction === 'fr-en' ? 'en' : 'fr';
  return (
    <motion.p className="flex min-w-0 items-center gap-2 text-[14px] font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
      <span className="relative truncate text-correction-text" lang={shownLang}>
        {text}
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px origin-left bg-correction"
          initial={{ scaleX: reduced ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={correct.strike(0)}
        />
      </span>
      <span className="text-ink-subtle" aria-hidden="true">=</span>
      <motion.span
        className="truncate text-ink"
        lang={answerLang}
        initial={{ opacity: 0, y: reduced ? 0 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.2 } : correct.fix(0)}
      >
        {answer}
      </motion.span>
    </motion.p>
  );
}

function toastFor(event: GameEvent): string | null {
  if (event.kind === 'wave') return `Wave ${event.wave}. A little faster.`;
  if (event.kind === 'heal') return 'Heart won back';
  return null;
}

function announce(game: GameState): string {
  const e = game.event;
  if (!e) return '';
  const tail = e.seq % 2 === 0 ? '​' : '';
  switch (e.kind) {
    case 'clear':
      return `Cleared. ${e.points} points.${e.multiplier > 1 ? ` Multiplier ${e.multiplier}.` : ''}${tail}`;
    case 'miss':
      return game.miss ? `Missed ${game.miss.text}. It means ${game.miss.answer}. ${game.lives} lives left.${tail}` : `Missed.${tail}`;
    case 'wave':
      return `Wave ${e.wave}.${tail}`;
    case 'heal':
      return `Heart won back.${tail}`;
    case 'over':
      return `Game over. Score ${game.score}.`;
  }
}
