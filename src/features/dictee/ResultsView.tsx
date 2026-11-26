import { motion, useReducedMotion } from 'framer-motion';
import { CheckCheck, Ear, Target, Trophy, Volume2 } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { PlayIconButton } from '../../components/ui/PlayButton';
import { StatTile } from '../../components/ui/StatTile';
import { CountUp } from '../../components/motion/CountUp';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { TTS } from '../../services/tts/ttsService';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { MIN_SLIPS_ROUND, type RoundSummary } from './engine';
import { slipSummary } from './feedbackText';
import { Stars } from './parts';
import type { Best } from './store';

interface Props {
  summary: RoundSummary;
  /** The best on this setting, this round included. */
  best: Best | null;
  newBest: boolean;
  noun: 'word' | 'sentence';
  onAgain: () => void;
  onDrill: () => void;
  onSetup: () => void;
  onExit: () => void;
}

const VERDICT = ['Keep listening: it gets easier.', 'A good start.', 'Well heard.', 'A sharp ear.'] as const;

/**
 * The end of a round: the score and stars, four honest numbers, and — the part
 * that teaches — every line that wasn't perfect, with a voice, what you wrote
 * and what to look at, plus a round made only of those lines.
 */
export function ResultsView({ summary, best, newBest, noun, onAgain, onDrill, onSetup, onExit }: Props) {
  useSfxOnChange('complete', true, 200);
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { slips } = summary;
  const percent = Math.round(summary.accuracy * 100);
  const plural = noun === 'word' ? 'words' : 'sentences';

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-ink-subtle">Round over</p>
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
        <div className="mt-2 flex items-center gap-3">
          <p className="font-numeral text-num-xl text-ink" data-testid="dictee-final-score">
            <CountUp value={summary.score} grouped />
          </p>
          <Stars value={summary.stars} size={22} />
        </div>
        <p className="mt-1 text-[14px] text-ink-muted" data-testid="dictee-verdict">
          {VERDICT[summary.stars]}
          {best && !newBest ? ` Your best here is ${best.score}.` : ''}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={<Target size={16} className="text-info-text" aria-hidden="true" />} value={`${percent}%`} label="Right" />
          <StatTile icon={<CheckCheck size={16} className="text-progress-text" aria-hidden="true" />} value={`${summary.perfect} of ${summary.answered}`} label="Perfect" />
          <StatTile icon={<Trophy size={16} className="text-ink-muted" aria-hidden="true" />} value={summary.bestStreak} label="Best run of perfects" />
          <StatTile icon={<Ear size={16} className="text-action-text" aria-hidden="true" />} value={summary.listens} label="Listens in all" />
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <h2 className="text-section text-ink">To listen to again</h2>
        {slips.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">Every {noun} was perfect. Try the next level, or Sound-alikes.</p>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-ink-subtle">
              {slips.length} {slips.length === 1 ? noun : plural} to look at. They're now in My slips: get one right twice in a row and it leaves.
            </p>
            <ul className="mt-3 divide-y divide-hairline" data-testid="dictee-review">
              {slips.map(a => (
                <li key={a.item.id} className="flex items-start gap-3 py-3">
                  <PlayIconButton
                    prominent
                    size={16}
                    label={`Hear “${a.item.fr}”`}
                    icon={<Volume2 size={16} aria-hidden="true" />}
                    play={() => TTS.speak(a.item.fr, { recorded: true })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-ink" lang="fr">{a.item.fr}</p>
                    <p className="text-[13px] text-ink-muted" lang="en">{a.item.en}</p>
                    {a.skipped ? (
                      <p className="mt-1 text-[13px] text-ink-subtle">Skipped.</p>
                    ) : (
                      <p className="mt-1 text-[13px] text-ink-subtle">
                        You wrote <span lang="fr" className="text-ink-muted">“{a.typed.trim()}”</span>
                        {slipSummary(a.verdict) ? `: ${slipSummary(a.verdict)}.` : '.'}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button size="lg" onClick={onAgain} className="sm:min-w-[180px]" data-testid="dictee-again">Play again</Button>
        {slips.length >= MIN_SLIPS_ROUND && (
          <Button variant="secondary" size="lg" onClick={onDrill} data-testid="dictee-drill">
            Drill these {slips.length}
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
