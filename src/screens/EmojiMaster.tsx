import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { enter, enterReduced } from '../components/motion/variants';
import { TopContextBar } from '../components/TopContextBar';
import { useHideDock } from '../components/layout/shellChrome';
import { useBackHandler } from '../lib/useBackHandler';
import { EmojiMasterPicker } from './emoji-master/EmojiMasterPicker';
import { EmojiMasterResults } from './emoji-master/EmojiMasterResults';
import { useEmojiMasterRun } from './emoji-master/useEmojiMasterRun';
import { ClassicMode, ReverseMode } from './emoji-master/modes/ClassicMode';
import { HardcoreMode } from './emoji-master/modes/HardcoreMode';
import { BlitzMode } from './emoji-master/modes/BlitzMode';
import { ArenaMode } from './emoji-master/modes/ArenaMode';
import { MODE_META } from './emoji-master/modes';
import type { EmojiCategory, RunConfig } from './emoji-master/types';

/**
 * Emoji Master (Design System v2). Picker → get-ready count → one of five
 * modes → results. It awards no XP for now (owner, 2026-10-30): the only
 * things it saves are its personal bests and word collection, both local.
 */
export function EmojiMaster() {
  const navigate = useNavigate();
  const run = useEmojiMasterRun();
  const reduced = useReducedMotion();
  const [category, setCategory] = useState<EmojiCategory>('all');
  const [lastConfig, setLastConfig] = useState<RunConfig | null>(null);

  const inRun = run.phase === 'countdown' || run.phase === 'playing';
  // A run takes the whole phone screen, and a stray Escape must not abandon it.
  useHideDock(inRun);
  useBackHandler(() => inRun);

  const handleSelect = (config: RunConfig) => {
    setLastConfig(config);
    run.startRun(config);
  };

  /** Leaving with nothing answered just returns to the picker; otherwise the run is scored as ended. */
  const handleLeave = () => {
    if (run.totalAnswered === 0) run.resetToIdle();
    else run.endRun('quit');
  };

  if (run.phase === 'idle') {
    return (
      <EmojiMasterPicker
        category={category}
        onCategoryChange={setCategory}
        onSelect={handleSelect}
        onBack={() => navigate('/explore')}
      />
    );
  }

  if (run.phase === 'finished' && run.completion) {
    return (
      <EmojiMasterResults
        completion={run.completion}
        onPlayAgain={() => {
          if (lastConfig) run.startRun(lastConfig);
        }}
        onRetryMisses={(questionIds) => {
          if (lastConfig) run.startRun({ ...lastConfig, questionIds });
        }}
        onChangeMode={() => run.resetToIdle()}
        onBackToExplore={() => navigate('/explore')}
      />
    );
  }

  const mode = run.runConfig?.mode;
  const meta = mode ? MODE_META[mode] : null;

  return (
    <>
      <TopContextBar
        title="Emoji Master"
        subtitle={meta?.title}
        showBack
        onBack={handleLeave}
        backLabel="Leave this run"
      />
      <div className="mx-auto w-full max-w-[640px] px-4 pb-10 pt-4 sm:pt-6">
        {run.phase === 'countdown' && meta && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <p className="text-eyebrow uppercase text-ink-subtle">{meta.title}</p>
            <motion.div
              key={run.countdown.value}
              variants={reduced ? enterReduced : enter}
              initial="hidden"
              animate="show"
              aria-live="assertive"
              className="font-numeral text-[96px] leading-none text-action-text"
            >
              {run.countdown.display}
            </motion.div>
            <p className="max-w-sm text-body-s text-ink-muted">{meta.rule}</p>
          </div>
        )}
        {run.phase === 'playing' && mode === 'classic' && <ClassicMode run={run} />}
        {run.phase === 'playing' && mode === 'reverse' && <ReverseMode run={run} />}
        {run.phase === 'playing' && mode === 'hardcore' && <HardcoreMode run={run} />}
        {run.phase === 'playing' && mode === 'blitz' && <BlitzMode run={run} />}
        {run.phase === 'playing' && mode === 'arena' && <ArenaMode run={run} />}
      </div>
    </>
  );
}
