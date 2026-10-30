import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Flame } from 'lucide-react';
import { EMOJI_QUESTIONS } from '../../data/emojiQuestions';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { CountUp } from '../../components/motion/CountUp';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import type { ModeBestEntry, EmojiCategory, GameMode, RunConfig } from './types';
import { getModeBest } from './emojiMasterStorage';
import { CATEGORIES, MODE_META } from './modes';
import { MASTERED_AT, readWordCollection, summarizeCollection } from './wordCollection';

const GRID_MODES: GameMode[] = ['classic', 'reverse', 'hardcore', 'blitz'];

function BestLine({ best }: { best?: ModeBestEntry }) {
  if (!best) return <span className="text-caption text-ink-subtle">No best yet</span>;
  return (
    <span className="flex items-center gap-2 text-caption text-ink-muted">
      <span>
        Best <span className="font-numeral">{best.modeScore}</span> · Rank {best.bestGrade}
      </span>
      <span className="flex items-center gap-1 text-streak-text">
        <Flame size={12} aria-hidden="true" />
        <span className="font-numeral">{best.maxStreak}</span>
      </span>
    </span>
  );
}

interface EmojiMasterPickerProps {
  category: EmojiCategory;
  onCategoryChange: (c: EmojiCategory) => void;
  onSelect: (config: RunConfig) => void;
  onBack: () => void;
}

export function EmojiMasterPicker({ category, onCategoryChange, onSelect, onBack }: EmojiMasterPickerProps) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const summary = useMemo(() => summarizeCollection(readWordCollection(), EMOJI_QUESTIONS), []);
  const pct = summary.total > 0 ? (summary.mastered / summary.total) * 100 : 0;
  const ArenaIcon = MODE_META.arena.Icon;

  return (
    <>
      <TopContextBar title="Emoji Master" subtitle="Decode French from emojis" showBack onBack={onBack} backLabel="Back to Explore" />
      <PageShell maxWidth="home" gap={24}>
        <motion.section variants={item} aria-label="Your collection" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">Your collection</p>
              <p className="mt-1 flex items-baseline gap-2">
                <CountUp value={summary.mastered} className="font-numeral text-num-l text-ink" />
                <span className="text-body-s text-ink-muted">of {summary.total} words mastered</span>
              </p>
            </div>
            <p className="max-w-[260px] text-body-s text-ink-subtle">
              A word is mastered when you get it right {MASTERED_AT} times in a row.
              {summary.learning > 0 && ` ${summary.learning} more in progress.`}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Words mastered"
            aria-valuemin={0}
            aria-valuemax={summary.total}
            aria-valuenow={summary.mastered}
            className="h-2 overflow-hidden rounded-pill bg-track"
          >
            <motion.div
              className="h-full rounded-pill bg-progress"
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={reduced ? { duration: 0.2 } : fill()}
            />
          </div>
        </motion.section>

        <motion.div variants={item} className="flex flex-col gap-3">
          <h2 className="text-section text-ink">Pick a topic</h2>
          <div role="group" aria-label="Topic" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
            {CATEGORIES.map((c) => {
              const on = category === c.id;
              const counts = c.id === 'all' ? summary : summary.byCategory[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onCategoryChange(c.id)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-pill border px-3.5 text-label transition-colors duration-state ease-smooth active:scale-[.97]
                    ${on ? 'border-action bg-action-soft text-action-text' : 'border-hairline bg-surface text-ink-muted hover:border-hairline-strong hover:text-ink'}`}
                >
                  {c.label}
                  {counts && (
                    <span className="font-numeral text-caption text-ink-subtle">
                      {counts.mastered}/{counts.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.section variants={item} aria-label="Emoji Arena" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
            <ArenaIcon size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow uppercase text-action-text">Recommended</p>
            <h2 className="text-title text-ink">{MODE_META.arena.title}</h2>
            <p className="mt-1 text-body-s text-ink-muted">{MODE_META.arena.blurb}</p>
            <div className="mt-2">
              <BestLine best={getModeBest('arena')} />
            </div>
          </div>
          <Button size="lg" className="sm:w-auto" onClick={() => onSelect({ mode: 'arena', category })}>
            Start Arena
          </Button>
        </motion.section>

        <motion.div variants={item} className="flex flex-col gap-3">
          <h2 className="text-section text-ink">More ways to play</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {GRID_MODES.map((id) => {
              const meta = MODE_META[id];
              const Icon = meta.Icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect({ mode: id, category })}
                  className="flex items-center gap-4 rounded-card border border-hairline bg-surface p-4 text-left shadow-card
                    transition-[background-color,border-color,transform] duration-state ease-smooth hover:border-hairline-strong hover:bg-track active:scale-[.97] active:duration-press"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px] font-semibold text-ink">{meta.title}</span>
                    <span className="text-body-s text-ink-muted">{meta.blurb}</span>
                    <BestLine best={getModeBest(id)} />
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-subtle" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </PageShell>
    </>
  );
}
