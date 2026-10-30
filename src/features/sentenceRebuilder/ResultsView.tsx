import { motion, useReducedMotion } from 'framer-motion';
import { Check, Flame, Lightbulb, Target, Trophy } from 'lucide-react';
import type { RebuildQuestion } from '../../types';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { StatTile } from '../../components/ui/StatTile';
import { CountUp } from '../../components/motion/CountUp';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import type { GameState, Summary } from './engine';
import type { Best } from './store';
import { HearButton } from './HearButton';

interface Props {
  game: GameState;
  summary: Summary;
  /** The missed sentences, in the order they were met. */
  missed: RebuildQuestion[];
  best: Best | null;
  newBest: boolean;
  /** Sentences that crossed into "mastered" this round. */
  newlyMastered: number;
  onAgain: () => void;
  onDrill: () => void;
  onSetup: () => void;
  onExit: () => void;
}

function headline(game: GameState, summary: Summary): string {
  if (game.endedBy === 'clock') return `Time's up · ${summary.solved} ${summary.solved === 1 ? 'sentence' : 'sentences'} put right`;
  const first = game.done.filter(r => !r.repeat).length;
  if (summary.solved === 0) return 'None this time. The next round is yours.';
  return `${summary.clean} of ${first} first time · ${summary.solved} put right in all`;
}

/**
 * The end of a round. The score, four honest numbers and — the part that
 * teaches — the sentences that got away, each with its meaning and the rule
 * behind it, plus a drill that replays only those.
 */
export function ResultsView({ game, summary, missed, best, newBest, newlyMastered, onAgain, onDrill, onSetup, onExit }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const themes = [...new Set(missed.map(q => q.theme))];

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-ink-subtle">{game.drill ? 'Drill complete' : 'Round complete'}</p>
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
        <p className="mt-2 font-numeral text-num-xl text-ink" data-testid="rebuilder-final-score">
          <CountUp value={game.score} grouped />
        </p>
        <p className="mt-1 text-[14px] text-ink-muted">
          {headline(game, summary)}
          {best && !newBest && !game.drill ? ` · your best is ${best.score}` : ''}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={<Check size={16} className="text-progress-text" aria-hidden="true" />} value={summary.solved} label="Sentences put right" />
          <StatTile icon={<Target size={16} className="text-info-text" aria-hidden="true" />} value={`${summary.accuracy}%`} label="First-try accuracy" />
          <StatTile icon={<Flame size={16} className="text-streak-text" aria-hidden="true" />} value={game.bestCombo} label="Best run in a row" />
          <StatTile icon={<Lightbulb size={16} className="text-action-text" aria-hidden="true" />} value={summary.hints} label="Hints used" />
        </div>

        {newlyMastered > 0 && (
          <div className="mt-4">
            <Stat role="progress" soft icon={<Check size={14} />}>
              {newlyMastered} {newlyMastered === 1 ? 'sentence' : 'sentences'} newly mastered
            </Stat>
          </div>
        )}
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <h2 className="text-section text-ink">Worth another look</h2>
        {missed.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">
            {summary.solved === 0 ? 'Nothing to review yet.' : 'Every sentence landed. Try a harder level, or Tricky mode.'}
          </p>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-ink-subtle">
              {missed.length} {missed.length === 1 ? 'sentence' : 'sentences'} to revisit · {themes.join(' · ')}
            </p>
            <ul className="mt-3 divide-y divide-hairline" data-testid="rebuilder-review">
              {missed.map(q => (
                <li key={q.id} className="flex items-start gap-2 py-3">
                  <HearButton text={q.french} label={`Hear: ${q.french}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-ink" lang="fr">{q.french}</p>
                    <p className="text-[13px] text-ink-muted" lang="en">{q.english}</p>
                    <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-subtle">{q.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button size="lg" onClick={onAgain} className="sm:min-w-[180px]">Play again</Button>
        {missed.length > 0 && (
          <Button variant="secondary" size="lg" onClick={onDrill}>
            Drill the {missed.length} {missed.length === 1 ? 'miss' : 'misses'}
          </Button>
        )}
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="quiet" size="md" onClick={onSetup}>Change settings</Button>
          <Button variant="quiet" size="md" onClick={onExit}>Back to Explore</Button>
        </div>
      </motion.div>
    </PageShell>
  );
}
