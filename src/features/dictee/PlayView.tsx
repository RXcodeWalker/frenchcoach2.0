import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, CheckCheck, Eye, Languages, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { TopicChip } from '../../components/ui/TopicChip';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { useSfxOnChange } from '../../services/sound/useSfx';
import type { Speed } from './audio';
import { currentItem, EAR_BONUS, type Attempt, type GameState } from './engine';
import { headlineFor, type Tone } from './feedbackText';
import { AnswerBox } from './AnswerBox';
import { MarkedAnswer, SlipNotes } from './MarkedAnswer';
import { ListenButtons } from './parts';

interface Props {
  game: GameState;
  /** Which speed is sounding now. */
  playing: Speed | null;
  onListen: (speed: Speed) => void;
  onMeaning: () => void;
  onSubmit: (typed: string) => void;
  onGiveUp: () => void;
  onNext: () => void;
}

const TONE_CLASS: Record<Tone, string> = {
  perfect: 'text-progress-text',
  close: 'text-info-text',
  miss: 'text-correction-text',
};

/**
 * The play screen (Design System v2): where you are and what you've scored, the
 * line to listen to, the answer box, and — once you check — the line as it is
 * written, your answer marked word by word and a sentence about each slip.
 * Colour carries meaning (progress = right, info = nearly, correction = not),
 * never alone. The only movement is the progress bar's `fill` and the named
 * `correct` entrance of the verdict.
 */
export function PlayView({ game, playing, onListen, onMeaning, onSubmit, onGiveUp, onNext }: Props) {
  const reduced = useReducedMotion();
  const rise = reduced ? enterReduced : enter;
  const line = currentItem(game);
  const attempt: Attempt | null = game.phase === 'feedback' ? game.attempts[game.attempts.length - 1] ?? null : null;

  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(-1);

  // A new line: clear the box, hear it once, and put the cursor in the box.
  useEffect(() => {
    if (game.phase !== 'answering') return;
    setValue('');
    inputRef.current?.focus();
    if (autoplayed.current !== game.index) {
      autoplayed.current = game.index;
      onListen('normal');
    }
    // onListen is a fresh closure each render; the line's index is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.index, game.phase]);

  // After checking, Enter goes on.
  useEffect(() => {
    if (attempt) nextRef.current?.querySelector('button')?.focus();
  }, [attempt]);

  // One cue per answer: a perfect one is `correct`, a miss the soft thud, "nearly" is quiet.
  useSfxOnChange(
    attempt ? (attempt.verdict.perfect ? 'correct' : attempt.verdict.credit < 0.5 ? 'wrong' : null) : null,
    attempt ? game.attempts.length : null,
  );

  if (!line) return null;
  const noun = line.format === 'words' ? 'word' : 'sentence';
  const total = game.items.length;
  const position = Math.min(game.index + 1, total);
  const answered = game.attempts.length;
  const last = game.index + 1 >= total;
  const canCheck = value.trim() !== '' && game.phase === 'answering';
  const showMeaning = game.usedMeaning || game.phase === 'feedback';

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pb-8 pt-4 md:px-8">
      <motion.div variants={rise} initial="hidden" animate="show" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold text-ink" data-testid="dictee-progress">
            {noun === 'word' ? 'Word' : 'Sentence'} {position} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Stat role="neutral" title="Points this round">
              <span data-testid="dictee-score">{game.score}</span> pts
            </Stat>
            {game.streak >= 2 && (
              <Stat role="progress" soft icon={<CheckCheck size={14} />} title="Perfect answers in a row">
                {game.streak} in a row
              </Stat>
            )}
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Round progress">
          <motion.div
            className="h-full rounded-pill bg-progress"
            initial={false}
            animate={{ width: `${(answered / total) * 100}%` }}
            transition={reduced ? { duration: 0 } : fill(0)}
          />
        </div>
      </motion.div>

      <motion.section variants={rise} initial="hidden" animate="show" className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          {/* the topic is a clue to what is said, so it waits until the answer is in */}
          {game.phase === 'feedback' && <TopicChip topicKey={line.topicKey} size={28} />}
          <p className="text-eyebrow uppercase text-ink-subtle">{game.phase === 'feedback' ? 'The line' : 'Listen'}</p>
        </div>

        {game.phase === 'feedback' && attempt ? null : (
          <p className="mt-3 text-[15px] leading-[1.55] text-ink-muted">
            {line.format === 'words'
              ? 'Type the word you hear, with its article (le, la, l’, un, une, les…).'
              : 'Type the whole sentence. Capitals and punctuation aren’t marked. Write numbers in letters.'}
          </p>
        )}

        <div className="mt-4">
          <ListenButtons playing={playing} heard={game.plays} onListen={onListen} size={game.phase === 'answering' ? 'lg' : 'md'} secondary={game.phase !== 'answering'} />
          <p className="sr-only" role="status" aria-live="polite">
            {playing ? 'Playing' : ''}
          </p>
        </div>

        {game.phase === 'answering' && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {showMeaning ? (
              <p className="flex items-center gap-2 rounded-control bg-surface-recessed px-3 py-2 text-[14px] text-ink-muted" lang="en" data-testid="dictee-meaning">
                <Languages size={14} aria-hidden="true" />
                {line.en}
              </p>
            ) : (
              <Button variant="quiet" size="sm" onClick={onMeaning} data-testid="dictee-show-meaning">
                <Eye size={14} aria-hidden="true" />
                Show the meaning
              </Button>
            )}
            <p className="text-[13px] text-ink-subtle">Listened {game.plays}×</p>
          </div>
        )}
      </motion.section>

      {game.phase === 'answering' && (
        <motion.section variants={rise} initial="hidden" animate="show" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
          <AnswerBox format={line.format} value={value} onChange={setValue} onSubmit={() => canCheck && onSubmit(value)} inputRef={inputRef} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button size="lg" disabled={!canCheck} onClick={() => onSubmit(value)} className="sm:min-w-[160px]" data-testid="dictee-check">
              <Check size={16} aria-hidden="true" />
              Check
            </Button>
            <Button variant="quiet" size="md" onClick={onGiveUp} className="sm:ml-auto" data-testid="dictee-skip">
              I couldn’t hear it
            </Button>
          </div>
        </motion.section>
      )}

      {attempt && <Feedback attempt={attempt} last={last} noun={noun} nextRef={nextRef} onNext={onNext} />}
    </div>
  );
}

function Feedback({
  attempt, last, noun, nextRef, onNext,
}: {
  attempt: Attempt;
  last: boolean;
  noun: string;
  nextRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const reduced = useReducedMotion();
  const { verdict, item, skipped } = attempt;
  const headline = headlineFor(verdict, skipped);
  const showMarks = !skipped && !verdict.empty;
  const caught = verdict.perfect && !skipped && (item.traps?.length ?? 0) > 0;

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card"
      data-testid="dictee-feedback"
      data-tone={headline.tone}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`flex items-center gap-2 text-section ${TONE_CLASS[headline.tone]}`} data-testid="dictee-headline">
          {headline.tone === 'perfect' ? <Check size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
          {headline.text}
        </p>
        <div className="flex items-center gap-2">
          {attempt.ear && (
            <Stat role="progress" soft icon={<Sparkles size={14} />} title="Perfect with no more than a couple of listens and no peek at the meaning">
              Sharp ear +{EAR_BONUS}
            </Stat>
          )}
          <Stat role="neutral" soft>
            +{attempt.points}
          </Stat>
        </div>
      </div>

      <div>
        <p className="text-eyebrow uppercase text-ink-subtle">It was written</p>
        <p className="mt-1.5 text-[22px] font-semibold leading-[1.35] text-ink" lang="fr" data-testid="dictee-correct">
          {item.fr}
        </p>
        <p className="mt-1 text-[14px] text-ink-muted" lang="en">
          {item.en}
        </p>
      </div>

      {showMarks && (
        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">You wrote</p>
          <MarkedAnswer marks={verdict.marks} />
        </div>
      )}

      {!verdict.perfect && showMarks && <SlipNotes marks={verdict.marks} />}
      {caught && <p className="text-[14px] leading-[1.5] text-progress-text">You told the sound-alikes apart: well heard.</p>}
      {skipped && <p className="text-[14px] leading-[1.5] text-ink-muted">No points for this one. Listen once more and read it as you hear it. It will come back in My slips.</p>}

      <div ref={nextRef} className="flex justify-end">
        <Button size="lg" onClick={onNext} className="sm:min-w-[180px]" data-testid="dictee-next">
          {last ? 'See results' : `Next ${noun}`}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </motion.section>
  );
}
