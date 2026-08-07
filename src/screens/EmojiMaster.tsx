import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameShell } from '../features/minigames';
import { EmojiMasterPicker } from './emoji-master/EmojiMasterPicker';
import { EmojiMasterResults } from './emoji-master/EmojiMasterResults';
import { useEmojiMasterRun } from './emoji-master/useEmojiMasterRun';
import { ClassicMode, ReverseMode } from './emoji-master/modes/ClassicMode';
import { HardcoreMode } from './emoji-master/modes/HardcoreMode';
import { BlitzMode } from './emoji-master/modes/BlitzMode';
import { ArenaMode } from './emoji-master/modes/ArenaMode';
import type { EmojiCategory, RunConfig } from './emoji-master/types';

export function EmojiMaster() {
  const navigate = useNavigate();
  const run = useEmojiMasterRun();
  const [category, setCategory] = useState<EmojiCategory>('all');
  const [lastConfig, setLastConfig] = useState<RunConfig | null>(null);

  const handleSelect = (config: RunConfig) => {
    setLastConfig(config);
    run.startRun(config);
  };

  const handleQuit = () => {
    run.endRun('quit');
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
        onChangeMode={() => run.resetToIdle()}
        onBackToExplore={() => navigate('/explore')}
      />
    );
  }

  const mode = run.runConfig?.mode;

  return (
    <GameShell
      phase={run.phase}
      countdownDisplay={run.countdown.display}
      countdownValue={run.countdown.value}
      maxWidthClassName="max-w-2xl"
      onBack={
        run.phase === 'countdown'
          ? undefined
          : () => navigate('/explore')
      }
    >
      {run.phase === 'playing' && mode === 'classic' && (
        <ClassicMode run={run} onQuit={handleQuit} />
      )}
      {run.phase === 'playing' && mode === 'reverse' && (
        <ReverseMode run={run} onQuit={handleQuit} />
      )}
      {run.phase === 'playing' && mode === 'hardcore' && (
        <HardcoreMode run={run} onQuit={handleQuit} />
      )}
      {run.phase === 'playing' && mode === 'blitz' && (
        <BlitzMode run={run} onQuit={handleQuit} />
      )}
      {run.phase === 'playing' && mode === 'arena' && (
        <ArenaMode run={run} onQuit={handleQuit} />
      )}
    </GameShell>
  );
}
