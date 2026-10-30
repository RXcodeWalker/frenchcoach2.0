import { motion, useReducedMotion } from 'framer-motion';
import { Gauge, Heart, Swords, Target } from 'lucide-react';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { StatTile } from '../../components/ui/StatTile';
import { Button } from '../../components/ui/Button';
import type { Boss } from './bosses';
import type { BossRecord } from './bossStore';
import { PLAYER_MAX_HP, type BattleSummary } from './engine';
import { Stars, TopicTag } from './parts';

interface Props {
  boss: Boss;
  summary: BattleSummary;
  /** The boss's closing line. */
  speech: string;
  /** Your record before this fight, to tell a new best from a repeat. */
  before: BossRecord | undefined;
  onRematch: () => void;
  onExit: () => void;
}

function verdict(summary: BattleSummary, before: BossRecord | undefined): string {
  if (!summary.won) return 'Read the misses below, then go again. The questions come back shuffled.';
  if (!before || before.wins === 0) return 'Your first win against this boss.';
  if (summary.stars > before.stars) return 'A new best: more stars than ever.';
  if (summary.stars === 3) return 'Close to flawless.';
  return summary.stars === 2 ? 'A solid win. Keep 80 health or more for three stars.' : 'Won, but only just. Guard the heavy blows to keep more health.';
}

/**
 * The end of a fight: win or loss, stars, four numbers, and every question you
 * missed with its answer and the rule. It records nothing and awards nothing
 * itself — `BattleView` has already saved the personal record.
 */
export function BattleResult({ boss, summary, speech, before, onRematch, onExit }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { won } = summary;

  return (
    <>
      <TopContextBar title="Boss Battles" subtitle={boss.name} showBack backLabel="Back to the bosses" onBack={onExit} />
      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} aria-labelledby="boss-result" className="rounded-card surface p-5 md:p-6">
          <p className="text-eyebrow uppercase text-action-text">{won ? 'Victory' : 'Defeated'}</p>
          <h2 id="boss-result" className="mt-2 text-title text-ink md:text-display-m">
            {won ? `${boss.name} is defeated` : `${boss.name} wins this time`}
          </h2>
          <p className="mt-2 text-body-s italic text-ink-muted">“{speech}”</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {won && (
              <motion.span
                variants={reduced ? undefined : celebrate}
                initial={reduced ? false : 'hidden'}
                animate="show"
                className="inline-flex h-8 items-center gap-2 rounded-pill border border-reward bg-reward-soft px-3"
              >
                <Stars value={summary.stars} size={16} />
              </motion.span>
            )}
            <p className="text-body-s text-ink-muted">{verdict(summary, before)}</p>
          </div>
        </motion.section>

        <motion.div variants={item} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={<Swords size={18} aria-hidden="true" className="text-action-text" />} value={summary.rounds} label="Rounds" />
          <StatTile icon={<Target size={18} aria-hidden="true" className="text-progress-text" />} value={`${summary.accuracy}%`} label="Answers right" />
          <StatTile icon={<Gauge size={18} aria-hidden="true" className="text-progress-text" />} value={`×${summary.maxCombo}`} label="Best combo" />
          <StatTile icon={<Heart size={18} aria-hidden="true" className="text-correction-text" />} value={`${summary.hpLeft}/${PLAYER_MAX_HP}`} label="Health left" />
        </motion.div>

        {summary.misses.length > 0 && (
          <motion.section variants={item} aria-labelledby="boss-misses" className="rounded-card surface p-4 md:p-5">
            <h2 id="boss-misses" className="text-section text-ink">Worth another look</h2>
            <ul className="mt-3 flex flex-col divide-y divide-hairline">
              {summary.misses.map(({ question, typed, timedOut }) => (
                <li key={question.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0" data-testid="boss-miss">
                  {boss.id === 'gauntlet' && <TopicTag questionId={question.id} />}
                  <p className="text-body-s text-ink-muted">{question.english}</p>
                  {typed.trim() && !timedOut && (
                    <p className="text-body-s text-correction-text">
                      <span className="sr-only">You wrote: </span>
                      <del>{typed}</del>
                    </p>
                  )}
                  <p className="font-exam text-body-l text-ink">{question.french[0]}</p>
                  <p className="text-body-s text-ink-muted">{question.tip}</p>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={onRematch} className="sm:min-w-[180px]">{won ? 'Fight again' : 'Try again'}</Button>
          <Button size="lg" variant="secondary" onClick={onExit}>{boss.id === 'gauntlet' ? 'Back to the bosses' : 'Choose another boss'}</Button>
        </motion.div>
      </PageShell>
    </>
  );
}
