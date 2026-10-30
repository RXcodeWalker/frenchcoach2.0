import { motion, useReducedMotion } from 'framer-motion';
import { Check, Flame, Layers, Target, Trophy } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { StatTile } from '../../components/ui/StatTile';
import { CountUp } from '../../components/motion/CountUp';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { accuracy, type GameState } from './engine';
import type { Best } from './bestStore';
import { HearButton } from './HearButton';

interface Props {
  game: GameState;
  /** The best on this setting, this round included. */
  best: Best | null;
  newBest: boolean;
  onAgain: () => void;
  onDrill: () => void;
  onSetup: () => void;
  onExit: () => void;
}

/** Fewer than this and a drill would just repeat the same word. */
const MIN_DRILL_WORDS = 3;

/**
 * The end of a round. The score line, four honest numbers, and — the part that
 * teaches — the words that got past, each with its meaning and a voice, with a
 * drill that plays only those.
 */
export function ResultsView({ game, best, newBest, onAgain, onDrill, onSetup, onExit }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const review = game.review;
  const acc = accuracy(game);

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-ink-subtle">Game over</p>
          {newBest && (
            <motion.span
              variants={celebrate}
              initial="hidden"
              animate="show"
              className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-reward-soft px-2.5 text-[13px] font-semibold text-reward-text"
            >
              <Trophy size={14} aria-hidden="true" />
              New best
            </motion.span>
          )}
        </div>
        <p className="mt-2 font-numeral text-num-xl text-ink" data-testid="word-drop-final-score">
          <CountUp value={game.score} grouped />
        </p>
        <p className="mt-1 text-[14px] text-ink-muted">
          {game.cleared === 0
            ? 'No words cleared this time. The next round is yours.'
            : `${game.cleared} ${game.cleared === 1 ? 'word' : 'words'} cleared${best && !newBest ? ` · your best is ${best.score}` : ''}`}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={<Check size={16} className="text-progress-text" aria-hidden="true" />} value={game.cleared} label="Words cleared" />
          <StatTile icon={<Target size={16} className="text-info-text" aria-hidden="true" />} value={`${acc}%`} label="Accuracy" />
          <StatTile icon={<Flame size={16} className="text-streak-text" aria-hidden="true" />} value={game.bestCombo} label="Best streak" />
          <StatTile icon={<Layers size={16} className="text-action-text" aria-hidden="true" />} value={game.wave} label="Wave reached" />
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <h2 className="text-section text-ink">Words to practise</h2>
        {review.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">
            {game.cleared === 0 ? 'Nothing missed yet.' : 'Every word that fell was caught. Try Quick, or a bigger topic.'}
          </p>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-ink-subtle">
              {review.length} {review.length === 1 ? 'word' : 'words'} got past you and weren't caught on a second go.
            </p>
            <ul className="mt-3 divide-y divide-hairline" data-testid="word-drop-review">
              {review.map(w => (
                <li key={w.id} className="flex min-h-[52px] items-center gap-3 py-1.5">
                  <HearButton text={w.fr} label={`Hear ${w.fr}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink" lang="fr">{w.fr}</p>
                    <p className="truncate text-[13px] text-ink-muted" lang="en">{w.en}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button size="lg" onClick={onAgain} className="sm:min-w-[180px]">Play again</Button>
        {review.length >= MIN_DRILL_WORDS && (
          <Button variant="secondary" size="lg" onClick={onDrill}>Drill the {review.length} missed words</Button>
        )}
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="quiet" size="md" onClick={onSetup}>Change settings</Button>
          <Button variant="quiet" size="md" onClick={onExit}>Back to Explore</Button>
        </div>
      </motion.div>
    </PageShell>
  );
}
