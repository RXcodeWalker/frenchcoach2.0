import { motion, useReducedMotion } from 'framer-motion';
import { MousePointerClick, Play, RotateCcw, Target, Trophy } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Stat } from '../../components/ui/Stat';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { MAX_ATTEMPTS, MASTERED_AT, ROUND_LENGTH, SPEED_START_MS } from './engine';
import type { Best } from './store';
import type { Level, Mode, Setup } from './types';

interface Props {
  setup: Setup;
  onChange: (next: Setup) => void;
  best: Best | null;
  /** Sentences in the chosen level, and how many of all sentences are mastered. */
  inLevel: number;
  mastered: number;
  totalSentences: number;
  onStart: () => void;
}

const RULES = [
  { Icon: MousePointerClick, title: 'Tap to build', body: 'Tap the French words in order. Tap a word on your line to take it back.' },
  { Icon: Target, title: 'Fix what is red', body: `A wrong check shows which words sit in the right place. You get ${MAX_ATTEMPTS} tries.` },
  { Icon: RotateCcw, title: 'Misses come back', body: 'A sentence you miss returns once, and lands in your list at the end.' },
] as const;

const LEVEL_NOTE: Record<Level, string> = {
  starter: 'Short sentences with one clear idea.',
  standard: 'Exam-level sentences: tenses, pronouns, linking words.',
  stretch: 'Longer sentences: the subjunctive, conditionals, tricky agreement.',
  mixed: 'A spread of all three, easiest first.',
};

const MODE_NOTE: Record<Mode, string> = {
  classic: `${ROUND_LENGTH} sentences, ${MAX_ATTEMPTS} tries each. Take your time.`,
  tricky: 'The same, with wrong words hidden in the bank. Pick carefully.',
  speed: `${SPEED_START_MS / 1000} seconds. Clean solves add time; misses take it away.`,
};

export function SetupView({ setup, onChange, best, inLevel, mastered, totalSentences, onStart }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const pct = totalSentences === 0 ? 0 : Math.round((mastered / totalSentences) * 100);

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <p className="text-eyebrow uppercase text-action-text">Grammar game</p>
        <h2 className="mt-2 text-title text-ink">Put the sentence back together</h2>
        <p className="mt-1.5 text-[15px] font-light leading-[1.6] text-ink-muted">
          Each round gives you an English sentence and a scatter of French words. Build it in the right order, and learn why it goes
          that way. Just for fun: it doesn't earn XP or count towards your streak.
        </p>

        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {RULES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-control bg-surface-recessed p-3">
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[13px] font-normal leading-[1.45] text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={item} className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Mode</p>
          <Segmented<Mode>
            label="Mode"
            value={setup.mode}
            onChange={mode => onChange({ ...setup, mode })}
            height={60}
            options={[
              { id: 'classic', label: 'Classic', note: 'Take your time' },
              { id: 'tricky', label: 'Tricky', note: 'Decoy words' },
              { id: 'speed', label: 'Speed', note: 'Beat the clock' },
            ]}
          />
          <p className="mt-2 text-[13px] text-ink-subtle">{MODE_NOTE[setup.mode]}</p>
        </div>

        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Level</p>
          <Segmented<Level>
            label="Level"
            value={setup.level}
            onChange={level => onChange({ ...setup, level })}
            options={[
              { id: 'starter', label: 'Starter' },
              { id: 'standard', label: 'Standard' },
              { id: 'stretch', label: 'Stretch' },
              { id: 'mixed', label: 'Mixed' },
            ]}
          />
          <p className="mt-2 text-[13px] text-ink-subtle">
            {LEVEL_NOTE[setup.level]} <span className="font-numeral">{inLevel}</span> sentences.
          </p>
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section text-ink">Sentences mastered</h2>
          <p className="font-numeral text-[15px] text-ink" data-testid="rebuilder-mastered">
            {mastered} <span className="text-ink-subtle">of {totalSentences}</span>
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-track" role="img" aria-label={`${mastered} of ${totalSentences} sentences mastered`}>
          <motion.div
            className="h-full rounded-pill bg-progress"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={reduced ? { duration: 0 } : fill(0)}
          />
        </div>
        <p className="mt-2 text-[13px] text-ink-subtle">
          Put a sentence right first time, with no hint, in {MASTERED_AT} different rounds to master it. Sentences you haven't mastered come up first.
        </p>
      </motion.section>

      <motion.div variants={item} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {best ? (
            <Stat role="reward" soft icon={<Trophy size={14} />}>Best {best.score} pts</Stat>
          ) : (
            <Stat role="neutral">No best yet on this setting</Stat>
          )}
        </div>
        <Button size="lg" onClick={onStart} disabled={inLevel < 1} className="sm:min-w-[200px]" data-testid="rebuilder-start">
          <Play size={16} aria-hidden="true" />
          Start round
        </Button>
      </motion.div>
    </PageShell>
  );
}
