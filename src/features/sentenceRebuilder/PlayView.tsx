import { useEffect, useRef } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Delete, Flame, Lightbulb, Pause, SkipForward, Timer } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { hasCommandModifier, isDialogOpen, isInteractiveTarget, isTypingTarget } from '../../lib/keyboardShortcuts';
import { AnswerPanel } from './AnswerPanel';
import { MAX_ATTEMPTS, SPEED_CAP_MS, isFull, type GameState, type Mark } from './engine';
import type { RebuilderRound } from './useRebuilderRound';
import { EmptySlot, TileGhost, WordTile, type TileTone } from './WordTile';

interface Props {
  game: GameState;
  round: RebuilderRound;
  /** Show the pause / leave card in place of the sentence. */
  interrupted: boolean;
  onPause: () => void;
  onKeepPlaying: () => void;
  onLeave: () => void;
}

/** Moves keyboard focus to the button now sitting at `index` (or the last one), so tapping with Enter never drops the cursor. */
function refocus(container: HTMLElement | null, index: number, fallback?: HTMLElement | null) {
  requestAnimationFrame(() => {
    const buttons = container ? [...container.querySelectorAll<HTMLButtonElement>('button:not([disabled])')] : [];
    (buttons[Math.min(index, buttons.length - 1)] ?? fallback)?.focus();
  });
}

const seconds = (ms: number) => Math.ceil(ms / 1000);
const toneForMark = (mark: Mark | undefined): TileTone => (mark === 'right' ? 'right' : mark === 'wrong' ? 'wrong' : 'placed');

/**
 * The play screen (Design System v2): points and progress, the English to
 * translate, the line being built, the bank of words, and the controls. After a
 * sentence settles, the answer panel replaces the controls. Colour carries
 * meaning — a word you placed is action, a word in the right place after a
 * check is progress, one out of place is correction. The only movement is a word
 * gliding between the bank and the line (`slide`) and the named answer motions.
 */
export function PlayView({ game, round, interrupted, onPause, onKeepPlaying, onLeave }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const lineRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { current: s, phase, setup } = game;
  const speed = setup.mode === 'speed';
  const q = s.question;
  const showCard = interrupted || phase === 'paused';
  const settled = phase === 'feedback';
  const full = isFull(s);
  const canCheck = phase === 'building' && full && s.marks === null;
  const attemptsLeft = MAX_ATTEMPTS - s.attempts;

  // Enter checks (or moves on); Backspace takes the last word back. Anything that
  // already acts on those keys — a focused button, a field, a dialog — keeps them.
  const keys = useRef({ phase, canCheck, round, showCard });
  keys.current = { phase, canCheck, round, showCard };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.defaultPrevented || k.showCard || hasCommandModifier(e) || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === 'Enter') {
        if (isInteractiveTarget(e.target)) return;
        if (k.phase === 'feedback') k.round.next();
        else if (k.canCheck) k.round.check();
        else return;
        e.preventDefault();
      } else if (e.key === 'Backspace' && k.phase === 'building' && !isInteractiveTarget(e.target)) {
        e.preventDefault();
        k.round.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tileTone = (index: number): TileTone => {
    if (s.outcome === 'clean' || s.outcome === 'solved') return 'done';
    if (s.outcome) return 'placed';
    return toneForMark(s.marks?.[index]);
  };

  const rightCount = s.marks?.filter(m => m === 'right').length ?? 0;
  const status =
    s.marks !== null
      ? `${rightCount} of ${s.marks.length} ${s.marks.length === 1 ? 'word is' : 'words are'} in the right place. Change the red ones, then check again${
          speed ? '.' : ` · ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left`
        }`
      : phase === 'building'
        ? `${s.built.length} of ${q.fragments.length} words placed`
        : '';

  if (showCard) {
    return (
      <motion.section variants={item} initial="hidden" animate="show" className="rounded-card border border-hairline bg-surface p-5 shadow-card" data-testid="rebuilder-paused">
        <h2 className="text-section text-ink">{speed ? 'Paused' : 'Leave this round?'}</h2>
        <p className="mt-1.5 text-[14px] text-ink-muted">
          {speed ? 'The clock is stopped and the sentence is hidden.' : "Your score for this round won't be saved."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={onKeepPlaying} autoFocus>Keep playing</Button>
          <Button variant="quiet" size="lg" onClick={onLeave}>Leave round</Button>
        </div>
      </motion.section>
    );
  }

  const urgent = game.timeMs !== null && game.timeMs <= 10_000;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-5">
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">Points</p>
            <p className="font-numeral text-[28px] leading-[1.15] text-ink" data-testid="rebuilder-score">{game.score}</p>
          </div>
          <div className="min-w-[110px] pb-1.5">
            {speed ? (
              <>
                <p className={`flex items-center gap-1.5 text-[13px] font-semibold ${urgent ? 'text-correction-text' : 'text-ink-muted'}`} data-testid="rebuilder-time">
                  <Timer size={14} aria-hidden="true" />
                  {seconds(game.timeMs ?? 0)}s
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-track" aria-hidden="true">
                  <div
                    className={`h-full rounded-pill ${urgent ? 'bg-correction' : 'bg-action'}`}
                    style={{ width: `${Math.min(100, ((game.timeMs ?? 0) / SPEED_CAP_MS) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-ink-muted" data-testid="rebuilder-position">
                  Sentence {Math.min(game.done.length + 1, game.total)} of {game.total}
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-track" aria-hidden="true">
                  <motion.div
                    className="h-full rounded-pill bg-progress"
                    initial={false}
                    animate={{ width: `${(game.done.length / Math.max(1, game.total)) * 100}%` }}
                    transition={reduced ? { duration: 0 } : fill(0)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pb-1">
          {game.combo > 0 && (
            <Stat role="progress" icon={<Flame size={14} />} title="First-try solves in a row">
              <span data-testid="rebuilder-combo">{game.combo}</span> in a row
            </Stat>
          )}
          {speed && (
            <Button variant="secondary" size="sm" onClick={onPause} aria-label="Pause">
              <Pause size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
          )}
        </div>
      </div>

      <motion.section
        key={`${q.id}:${s.repeat}`}
        variants={item}
        initial="hidden"
        animate="show"
        className="rounded-card border border-hairline bg-surface p-5 shadow-card"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-ink-subtle">Put this into French</p>
          <span className="truncate text-[13px] font-semibold text-ink-subtle">
            {s.repeat ? 'Second go · ' : ''}{q.theme}
          </span>
        </div>
        <h2 className="mt-2 text-title text-ink" lang="en" data-testid="rebuilder-english">{q.english}</h2>
      </motion.section>

      <LayoutGroup>
        <div
          ref={lineRef}
          role="group"
          aria-label="Your sentence"
          data-testid="rebuilder-line"
          className="flex min-h-[92px] flex-wrap content-center items-center gap-2 rounded-card border border-hairline bg-surface-recessed p-4"
        >
          {s.built.map((id, i) => {
            const tile = s.tiles.find(t => t.id === id);
            if (!tile) return null;
            const tone = tileTone(i);
            const mark = s.marks?.[i];
            return (
              <WordTile
                key={id}
                tileId={id}
                text={tile.text}
                tone={tone}
                disabled={phase !== 'building'}
                label={mark ? `${tile.text}, ${mark === 'right' ? 'in the right place' : 'in the wrong place'}. Press to take it back` : `${tile.text}. Press to take it back`}
                onActivate={kb => {
                  round.remove(id);
                  if (kb) refocus(lineRef.current, i, bankRef.current?.querySelector('button'));
                }}
              />
            );
          })}
          {phase === 'building' && Array.from({ length: Math.max(0, q.fragments.length - s.built.length) }, (_, i) => <EmptySlot key={i} />)}
        </div>

        <p
          role="status"
          aria-live="polite"
          className={`min-h-[22px] text-[14px] ${s.marks !== null ? 'font-semibold text-correction-text' : 'text-ink-subtle'}`}
          data-testid="rebuilder-status"
        >
          {status}
        </p>

        {!settled && (
          <div ref={bankRef} role="group" aria-label="Words to use" data-testid="rebuilder-bank" className="flex flex-wrap gap-2">
            {s.tiles.map(tile =>
              s.built.includes(tile.id) ? (
                <TileGhost key={tile.id} text={tile.text} />
              ) : (
                <WordTile
                  key={tile.id}
                  tileId={tile.id}
                  text={tile.text}
                  tone="plain"
                  onActivate={kb => {
                    const index = [...(bankRef.current?.querySelectorAll('button') ?? [])].findIndex(b => b.textContent === tile.text);
                    round.place(tile.id);
                    if (kb) refocus(bankRef.current, index, actionsRef.current?.querySelector('button'));
                  }}
                />
              ),
            )}
          </div>
        )}
      </LayoutGroup>

      {settled ? (
        <AnswerPanel sentence={s} speed={speed} last={!speed && game.queue.length === 0} onNext={round.next} />
      ) : (
        <div ref={actionsRef} className="mt-1 flex flex-col gap-3">
          <Button
            size="lg"
            onClick={round.check}
            disabled={!canCheck}
            className="w-full sm:w-auto sm:min-w-[200px] sm:self-start"
            data-testid="rebuilder-check"
          >
            Check
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={round.hint} data-testid="rebuilder-hint">
              <Lightbulb size={14} aria-hidden="true" />
              Hint
            </Button>
            <Button variant="quiet" size="sm" onClick={round.undo} disabled={s.built.length === 0}>
              <Delete size={14} aria-hidden="true" />
              Undo
            </Button>
            <Button variant="quiet" size="sm" onClick={round.clear} disabled={s.built.length === 0}>Clear</Button>
            <Button variant="quiet" size="sm" onClick={round.skip} className="sm:ml-auto" data-testid="rebuilder-skip">
              <SkipForward size={14} aria-hidden="true" />
              Skip
            </Button>
          </div>
          <p className="text-[13px] text-ink-subtle">
            A hint sets down the next right word and lowers the points for this sentence.
            {speed ? ' A miss or a skip costs 3 seconds.' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
