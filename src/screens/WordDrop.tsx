import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { useHideDock } from '../components/layout/shellChrome';
import { useBackHandler } from '../lib/useBackHandler';
import { getBest, getLastSetup, recordResult, saveLastSetup, type Best } from '../features/wordDrop/bestStore';
import { PlayField } from '../features/wordDrop/PlayField';
import { ResultsView } from '../features/wordDrop/ResultsView';
import { SetupView, type Setup } from '../features/wordDrop/SetupView';
import type { PlayWord } from '../features/wordDrop/types';
import { useWordDropGame } from '../features/wordDrop/useWordDropGame';
import { getWordPool, playWords } from '../features/wordDrop/wordPool';

type View = 'setup' | 'play' | 'results';

const DEFAULT_SETUP: Setup = { direction: 'fr-en', pace: 'steady', topic: 'all' };

/** Columns in the field: three on a phone, up to five on a wide screen. */
function lanesForViewport(): number {
  if (typeof window === 'undefined') return 4;
  const rail = window.innerWidth >= 768 ? 88 : 0;
  const field = Math.min(760, window.innerWidth - rail - 32);
  return field < 480 ? 3 : field < 640 ? 4 : 5;
}

/**
 * Word Drop (Design System v2): French words fall, the learner types their
 * meaning to clear them — or the reverse. A game for its own sake: it plays the
 * vocabulary from Learn's question bank and keeps only a personal best on this
 * device. It deliberately writes no XP, Session, streak, mastery or evidence
 * (`wordDrop.isolation.test.ts`), and a round never touches `AppContext`.
 */
export function WordDrop() {
  const navigate = useNavigate();
  const pool = useMemo(getWordPool, []);
  const { game, start, reset, pause, resume, end, type } = useWordDropGame();

  const [view, setView] = useState<View>('setup');
  const [setup, setSetup] = useState<Setup>(() => getLastSetup() ?? DEFAULT_SETUP);
  const [best, setBest] = useState<Best | null>(() => getBest(setup.direction, setup.pace));
  const [newBest, setNewBest] = useState(false);
  const recorded = useRef<object | null>(null);

  useHideDock(view === 'play');

  const changeSetup = (next: Setup) => {
    setSetup(next);
    setBest(getBest(next.direction, next.pace));
  };

  const begin = (words: PlayWord[]) => {
    saveLastSetup(setup);
    setNewBest(false);
    recorded.current = null;
    start({ direction: setup.direction, pace: setup.pace, lanes: lanesForViewport() }, words);
    setView('play');
  };

  const wordsForSetup = () => {
    const all = playWords(pool, setup.direction);
    return setup.topic === 'all' ? all : all.filter(w => w.topicKey === setup.topic);
  };

  // A finished round is stored once and moves on to the results.
  useEffect(() => {
    if (view !== 'play' || !game || game.phase !== 'over' || recorded.current === game) return;
    recorded.current = game;
    const { direction, pace } = game.settings;
    const result = { score: game.score, wave: game.wave, bestCombo: game.bestCombo, cleared: game.cleared };
    setNewBest(recordResult(direction, pace, result));
    setBest(getBest(direction, pace));
    setView('results');
  }, [view, game]);

  // Escape pauses a round and resumes a paused one; elsewhere it goes back.
  useBackHandler(() => {
    if (view !== 'play' || !game) return false;
    if (game.phase === 'playing') pause();
    else if (game.phase === 'paused') resume();
    return true;
  });

  const leave = () => navigate('/explore');
  const backToSetup = () => {
    reset();
    setView('setup');
  };

  if (view === 'play' && game) {
    return (
      <>
        <TopContextBar
          title="Word Drop"
          subtitle={game.phase === 'paused' ? 'Paused' : `Wave ${game.wave}`}
          showBack
          backLabel="Pause game"
          onBack={() => (game.phase === 'playing' ? pause() : resume())}
        />
        <div className="mx-auto w-full max-w-[760px] px-4 pb-8 pt-4 md:px-8">
          <PlayField game={game} onType={type} onPause={pause} onResume={resume} onEnd={end} />
        </div>
      </>
    );
  }

  if (view === 'results' && game) {
    return (
      <>
        <TopContextBar title="Word Drop" subtitle="Round summary" showBack backLabel="Back to setup" onBack={backToSetup} />
        <ResultsView
          game={game}
          best={best}
          newBest={newBest}
          onAgain={() => begin(wordsForSetup())}
          onDrill={() => begin([...game.review])}
          onSetup={backToSetup}
          onExit={leave}
        />
      </>
    );
  }

  return (
    <>
      <TopContextBar title="Word Drop" subtitle="Type the meaning before it lands" showBack backLabel="Back to Explore" onBack={leave} />
      <SetupView pool={pool} setup={setup} onChange={changeSetup} best={best} onStart={() => begin(wordsForSetup())} />
    </>
  );
}
