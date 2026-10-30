import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Check, EyeOff, Timer, User, X } from 'lucide-react';
import { correct, enter, enterReduced } from '../../components/motion/variants';
import { PageShell } from '../../components/layout/PageShell';
import { useHideDock } from '../../components/layout/shellChrome';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useBackHandler } from '../../lib/useBackHandler';
import { BattleResult } from './BattleResult';
import { readBossRecords, recordFight } from './bossStore';
import { MOVE_ACTION, MOVE_VISUALS } from './bossVisuals';
import {
  MOVES,
  PLAYER_MAX_HP,
  currentQuestion,
  isFogActive,
  moveStatus,
  roundSeconds,
  summarize,
  veilPrompt,
  type BattleState,
  type Move,
} from './engine';
import { describeEvent, eventTone, bossDamage, playerDelta } from './narration';
import { BossChip, FocusPips, HpBar, StatusPill } from './parts';
import { useBattle } from './useBattle';
import { useRoundClock } from './useRoundClock';
import type { Boss } from './bosses';

interface Props {
  boss: Boss;
  onExit: () => void;
  onRematch: () => void;
}

/**
 * One fight (Design System v2). The arena card shows both fighters — health,
 * Focus, statuses and the boss's telegraphed heavy blow — then the prompt, the
 * move picker and the answer box. After each answer a short report says what
 * happened (the `correct` motion: your answer struck through, the fix dropping
 * in, then the rule). Motion is only the eight named ones: health bars `fill`,
 * cards `enter`; there is no shake, glow or pulse.
 *
 * A fight touches no XP, session, mastery or evidence — only its own personal
 * record (`bossStore`), written once when the fight ends.
 */
export function BattleView({ boss, onExit, onRematch }: Props) {
  const { state, answer, next, clearFog } = useBattle(boss);
  const [typed, setTyped] = useState('');
  const [move, setMove] = useState<Move>('strike');
  const [reviewing, setReviewing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [before] = useState(() => readBossRecords().bosses[boss.id]);
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  const inputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);

  const over = state.stage === 'won' || state.stage === 'lost';
  const answering = state.stage === 'answering';
  const question = currentQuestion(state);

  useHideDock(true);

  // The personal record is written once, the moment the fight ends.
  useEffect(() => {
    if (over && !recorded.current) {
      recorded.current = true;
      recordFight(boss.id, summarize(state));
    }
  }, [over, boss.id, state]);

  // Typing goes to the box; Continue takes focus once the round is answered.
  useEffect(() => {
    if (reviewing) return;
    if (answering) inputRef.current?.focus();
    else reportRef.current?.querySelector('button')?.focus();
  }, [answering, state.round, reviewing]);

  useBackHandler(() => {
    if (reviewing) onExit();
    else if (!over) setLeaveOpen(true);
    else return false;
    return true;
  });

  const clock = useRoundClock({
    seconds: roundSeconds(state),
    running: answering,
    resetKey: state.round,
    onExpire: () => answer({ typed, move, timedOut: true }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!answering || !typed.trim()) return;
    answer({ typed, move });
  };

  const goNext = () => {
    if (over) {
      setReviewing(true);
      return;
    }
    setTyped('');
    setMove('strike');
    next();
  };

  if (reviewing) {
    return (
      <BattleResult
        boss={boss}
        summary={summarize(state)}
        speech={state.speech}
        before={before}
        onRematch={onRematch}
        onExit={onExit}
      />
    );
  }

  const fog = isFogActive(state);
  const events = state.last?.events ?? [];
  const bossHit = bossDamage(events);
  const youDelta = playerDelta(events);

  return (
    <>
      <TopContextBar
        title="Boss Battles"
        subtitle={boss.name}
        showBack
        backLabel={over ? 'Back to the bosses' : 'Leave the battle'}
        onBack={() => (over ? onExit() : setLeaveOpen(true))}
      />
      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} aria-label="The fighters" className="rounded-card surface p-4 md:p-5">
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <Fighter
              name={boss.name}
              note={state.phase === 2 ? 'Enraged' : boss.title}
              noteTone={state.phase === 2 ? 'bad' : 'plain'}
              chip={<BossChip id={boss.id} size={48} />}
              hp={state.bossHp}
              max={boss.hp}
              tone="boss"
              delta={bossHit > 0 ? -bossHit : 0}
              round={state.round}
            >
              <p className={`flex items-center gap-1.5 text-caption ${state.heavyIn === 1 ? 'font-semibold text-correction-text' : 'text-ink-subtle'}`}>
                <AlertTriangle size={14} aria-hidden="true" />
                {state.heavyIn === 1 ? 'Heavy blow this round' : `Heavy blow in ${state.heavyIn} rounds`}
              </p>
            </Fighter>

            <Fighter
              name="You"
              note={state.combo > 1 ? `Combo ×${state.combo}` : 'Answer to attack'}
              noteTone={state.combo > 1 ? 'good' : 'plain'}
              chip={
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-surface-recessed text-ink-muted"
                >
                  <User size={24} strokeWidth={1.75} />
                </span>
              }
              hp={state.playerHp}
              max={PLAYER_MAX_HP}
              tone="player"
              delta={youDelta}
              round={state.round}
            >
              <div className="flex items-center gap-2 text-caption text-ink-subtle">
                <span>Focus</span>
                <FocusPips value={state.focus} />
              </div>
            </Fighter>
          </div>

          <StatusRow state={state} />

          <div className="mt-4 rounded-control surface-recessed px-4 py-3">
            <p className="text-body-s text-ink">
              <span className="text-ink-subtle">{boss.name}: </span>
              <span data-testid="boss-speech">“{state.speech}”</span>
            </p>
          </div>
        </motion.section>

        <motion.section variants={item} aria-labelledby="boss-prompt-label" className="rounded-card surface p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <p id="boss-prompt-label" className="text-eyebrow uppercase text-action-text">
              Round {state.round} · Say it in French
            </p>
            {clock.secondsLeft !== null && answering && <ClockPill seconds={clock.secondsLeft} fraction={clock.fraction} />}
          </div>

          <p className="mt-3 text-title text-ink md:text-display-m" data-testid="boss-prompt">
            {fog ? veilPrompt(question.english) : question.english}
          </p>

          {fog && (
            <div className="mt-3 flex flex-col gap-2 rounded-control bg-info-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-body-s text-info-text">
                <EyeOff size={16} aria-hidden="true" className="shrink-0" />
                The fog hides half the sentence. Clearing it breaks your combo.
              </p>
              <Button size="sm" variant="secondary" onClick={clearFog}>Clear the fog</Button>
            </div>
          )}

          {answering ? (
            <>
              <div role="group" aria-label="Choose your move" className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {MOVES.map((m) => (
                  <MoveButton key={m} move={m} state={state} selected={move === m} onSelect={() => setMove(m)} />
                ))}
              </div>

              <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label htmlFor="boss-answer" className="sr-only">Your answer in French</label>
                <input
                  id="boss-answer"
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  lang="fr"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Type your answer in French"
                  className="h-12 min-w-0 flex-1 rounded-control border border-hairline-strong bg-surface px-4 text-body-l text-ink placeholder:text-ink-subtle
                    transition-colors duration-state ease-smooth focus-visible:border-action"
                />
                <Button type="submit" size="lg" disabled={!typed.trim()} className="sm:min-w-[160px]">
                  {MOVE_ACTION[moveStatus(state, move).usable ? move : 'strike']}
                </Button>
              </form>
              <p className="mt-2 text-caption text-ink-subtle">Accents and punctuation are optional.</p>
            </>
          ) : (
            <div ref={reportRef}>
              <RoundReport state={state} boss={boss} onNext={goNext} reducedMotion={!!reduced} />
            </div>
          )}
        </motion.section>
      </PageShell>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Leave this battle?"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button onClick={() => setLeaveOpen(false)}>Keep fighting</Button>
            <Button variant="destructive" onClick={onExit}>Leave</Button>
          </div>
        }
      >
        <p className="text-body-s text-ink-muted">This fight will end and won’t be saved. The boss keeps its health for no one.</p>
      </Modal>
    </>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────

function Fighter({
  name,
  note,
  noteTone,
  chip,
  hp,
  max,
  tone,
  delta,
  round,
  children,
}: {
  name: string;
  note: string;
  noteTone: 'plain' | 'bad' | 'good';
  chip: React.ReactNode;
  hp: number;
  max: number;
  tone: 'boss' | 'player';
  /** Health change from the round just played: negative = lost, positive = healed. */
  delta: number;
  round: number;
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        {chip}
        <div className="flex min-w-0 flex-col">
          <p className="text-label text-ink">{name}</p>
          <p className={`text-caption ${noteTone === 'bad' ? 'font-semibold text-correction-text' : noteTone === 'good' ? 'font-semibold text-progress-text' : 'text-ink-subtle'}`}>
            {note}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-caption">
          <span className="text-ink-subtle">{tone === 'boss' ? 'Boss health' : 'Your health'}</span>
          <span className="flex items-center gap-2">
            {delta !== 0 && (
              <motion.span
                key={`${round}-${delta}`}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
                className={`font-numeral font-semibold ${delta > 0 ? 'text-progress-text' : tone === 'boss' ? 'text-ink-muted' : 'text-correction-text'}`}
              >
                {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
              </motion.span>
            )}
            <span className="font-numeral text-ink">{hp} / {max}</span>
          </span>
        </div>
        <HpBar value={hp} max={max} tone={tone} label={tone === 'boss' ? 'Boss health' : 'Your health'} />
      </div>
      {children}
    </div>
  );
}

function StatusRow({ state }: { state: BattleState }) {
  const pills: React.ReactNode[] = [];
  if (state.guard) pills.push(<StatusPill key="guard" tone="info">Guard up</StatusPill>);
  if (state.poisoned) pills.push(<StatusPill key="poison" tone="bad">Poisoned</StatusPill>);
  if (state.stunned) pills.push(<StatusPill key="stun" tone="bad">Stunned</StatusPill>);
  if (state.lock) {
    pills.push(
      <StatusPill key="lock" tone="bad">
        {MOVE_VISUALS[state.lock.move].label} locked · {state.lock.rounds} {state.lock.rounds === 1 ? 'round' : 'rounds'}
      </StatusPill>,
    );
  }
  if (pills.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Your status">
      {pills}
    </div>
  );
}

function ClockPill({ seconds, fraction }: { seconds: number; fraction: number }) {
  const low = seconds <= 5;
  return (
    <div className="flex items-center gap-2" role="timer" aria-label={`${seconds} seconds left`}>
      <Timer size={16} aria-hidden="true" className={low ? 'text-correction-text' : 'text-ink-muted'} />
      <div className="h-1.5 w-20 overflow-hidden rounded-pill bg-track" aria-hidden="true">
        <div
          className={`h-full rounded-pill ${low ? 'bg-correction' : 'bg-action'}`}
          style={{ width: `${fraction * 100}%`, transition: 'width 200ms linear' }}
        />
      </div>
      <span className={`w-6 text-right font-numeral text-label ${low ? 'text-correction-text' : 'text-ink-muted'}`}>{seconds}</span>
    </div>
  );
}

function MoveButton({ move, state, selected, onSelect }: { move: Move; state: BattleState; selected: boolean; onSelect: () => void }) {
  const status = moveStatus(state, move);
  const visual = MOVE_VISUALS[move];
  const on = selected && status.usable;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!status.usable}
      onClick={onSelect}
      className={`flex min-h-[64px] flex-col gap-1 rounded-control border p-3 text-left transition-[background-color,border-color,color,transform] duration-state ease-smooth active:scale-[.97] disabled:active:scale-100
        ${on
          ? 'border-action bg-action-soft text-action-text'
          : status.usable
            ? 'border-hairline bg-surface text-ink hover:border-hairline-strong'
            : 'border-hairline bg-surface-recessed text-ink-subtle'}`}
    >
      <span className="flex items-center gap-2 text-label">
        <visual.Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        {visual.label}
        {visual.cost && status.usable && <span className="font-normal text-ink-subtle">· {visual.cost}</span>}
      </span>
      <span className={`text-caption ${on ? 'text-action-text' : status.usable ? 'text-ink-muted' : 'text-ink-subtle'}`}>
        {status.usable ? visual.effect : status.reason}
      </span>
    </button>
  );
}

function RoundReport({ state, boss, onNext, reducedMotion }: { state: BattleState; boss: Boss; onNext: () => void; reducedMotion: boolean }) {
  const last = state.last;
  if (!last) return null;
  const over = state.stage === 'won' || state.stage === 'lost';
  const hasAnswer = last.typed.trim() !== '' && !last.timedOut;

  return (
    <div className="mt-5 flex flex-col gap-4" data-testid="boss-report">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 items-center justify-center rounded-pill ${last.correct ? 'bg-progress-soft text-progress-text' : 'bg-correction-soft text-correction-text'}`}
        >
          {last.correct ? <Check size={16} /> : <X size={16} />}
        </span>
        <h3 className={`text-section ${last.correct ? 'text-progress-text' : 'text-correction-text'}`}>
          {last.correct ? 'Correct' : last.timedOut ? 'Time’s up' : 'Not quite'}
        </h3>
      </div>

      {!last.correct && (
        <div className="flex flex-col gap-2 rounded-control surface-recessed p-4">
          {hasAnswer && (
            <p className="text-body-s text-ink-muted">
              <span className="sr-only">You wrote: </span>
              <del className="relative inline-block text-correction-text no-underline">
                {last.typed}
                <motion.span
                  aria-hidden="true"
                  className="absolute left-0 right-0 top-1/2 h-px origin-left bg-correction"
                  initial={reducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={correct.strike(0.1)}
                />
              </del>
            </p>
          )}
          <motion.p
            className="font-exam text-body-l text-ink"
            data-testid="boss-model-answer"
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={correct.fix(0.1)}
          >
            <span className="sr-only">Correct answer: </span>
            {last.question.french[0]}
          </motion.p>
          <p className="text-body-s text-ink-muted">{last.question.tip}</p>
        </div>
      )}

      <ul className="flex flex-col gap-1.5" aria-live="polite" aria-label="What happened">
        {last.events.map((event, i) => {
          const tone = eventTone(event);
          return (
            <li
              key={i}
              className={`flex items-start gap-2 text-body-s ${tone === 'good' ? 'text-progress-text' : tone === 'bad' ? 'text-correction-text' : 'text-ink-muted'}`}
            >
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-current" />
              <span>{describeEvent(event, boss)}</span>
            </li>
          );
        })}
      </ul>

      <div>
        <Button size="lg" onClick={onNext} className="w-full sm:w-auto sm:min-w-[180px]">
          {over ? 'See the result' : 'Next round'}
        </Button>
      </div>
    </div>
  );
}
