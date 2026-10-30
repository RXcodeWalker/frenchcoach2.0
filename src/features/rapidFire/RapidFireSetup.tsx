import { motion, useReducedMotion } from 'framer-motion';
import { Box, Check, Heart, MessageSquareQuote, Shuffle, Timer, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TopicChip } from '../../components/ui/TopicChip';
import { PageShell } from '../../components/layout/PageShell';
import { enter, enterReduced } from '../../components/motion/variants';
import { getBest } from './bests';
import { BONUS_EVERY, BONUS_SECONDS, RUN_SECONDS, START_HEARTS, TIME_PENALTY } from './run';
import type { WordSet, WordSetKind } from './wordBank';

interface Props {
  sets: WordSet[];
  selectedId: string;
  onSelect: (id: string) => void;
  onStart: () => void;
}

const QUICK_ICON: Record<Exclude<WordSetKind, 'topic'>, LucideIcon> = {
  mixed: Shuffle,
  phrases: MessageSquareQuote,
  objects: Box,
};

const RULES: Array<{ Icon: LucideIcon; title: string; text: string }> = [
  { Icon: Timer, title: `${RUN_SECONDS} seconds`, text: `Every ${BONUS_EVERY} in a row adds ${BONUS_SECONDS} seconds.` },
  { Icon: Heart, title: `${START_HEARTS} hearts`, text: `A wrong answer costs a heart and ${TIME_PENALTY} seconds.` },
  { Icon: Zap, title: 'Combos', text: `Keep a run going and your points multiply, up to ×5.` },
];

function SetButton({ set, on, onSelect }: { set: WordSet; on: boolean; onSelect: () => void }) {
  const Quick = set.kind === 'topic' ? null : QUICK_ICON[set.kind];
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onSelect}
      data-testid={`rf-set-${set.id}`}
      className={`flex min-h-14 items-center gap-3 rounded-control border px-3 text-left
        transition-[background-color,border-color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press
        ${on ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:bg-track'}`}
    >
      {Quick ? (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted">
          <Quick size={16} strokeWidth={1.75} />
        </span>
      ) : (
        <TopicChip topicKey={set.topicKey} size={36} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label text-ink">{set.label}</span>
        <span className="block text-caption text-ink-subtle">{set.words.length} words</span>
      </span>
      {on && <Check size={16} aria-hidden="true" className="shrink-0 text-action-text" />}
    </button>
  );
}

/** Rapid Fire's start screen: the rules in three lines, a word set, and one primary Start. */
export function RapidFireSetup({ sets, selectedId, onSelect, onStart }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const selected = sets.find(s => s.id === selectedId) ?? sets[0];
  const best = getBest(selected.id);
  const quick = sets.filter(s => s.kind !== 'topic');
  const topics = sets.filter(s => s.kind === 'topic');

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="rf-title">
        <p className="text-eyebrow uppercase text-ink-subtle">{RUN_SECONDS}-second sprint</p>
        <h2 id="rf-title" className="mt-2 text-title text-ink">Translate as many words as you can</h2>
        <p className="mt-2 text-body-s text-ink-muted">
          Read the English, type the French, press Enter. Spelling and the article count (la pomme, not pomme); accents are optional.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {RULES.map(({ Icon, title, text }) => (
            <li key={title} className="rounded-control bg-surface-recessed p-4">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-control bg-surface text-ink-muted">
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-label text-ink">{title}</p>
              <p className="mt-1 text-body-s text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="rf-sets">
        <h2 id="rf-sets" className="text-section text-ink">Word set</h2>
        <div role="group" aria-label="Word set" className="mt-4 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {quick.map(s => (
              <SetButton key={s.id} set={s} on={s.id === selected.id} onSelect={() => onSelect(s.id)} />
            ))}
          </div>
          <div>
            <p className="mb-2 text-eyebrow uppercase text-ink-subtle">By topic</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topics.map(s => (
                <SetButton key={s.id} set={s} on={s.id === selected.id} onSelect={() => onSelect(s.id)} />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label text-ink">{selected.label}</p>
            <p className="text-body-s text-ink-muted" data-testid="rf-best">
              {best ? (
                <>Your best: <span className="font-numeral text-ink">{best.score}</span> points, <span className="font-numeral text-ink">{best.maxStreak}</span> in a row</>
              ) : (
                'No best yet. Set the first one.'
              )}
            </p>
            <p className="mt-1 text-caption text-ink-subtle">Rapid Fire doesn&rsquo;t earn XP yet. Play for your personal best.</p>
          </div>
          <Button size="lg" onClick={onStart} className="sm:min-w-40" data-testid="rf-start">
            Start
          </Button>
        </div>
      </motion.section>
    </PageShell>
  );
}
