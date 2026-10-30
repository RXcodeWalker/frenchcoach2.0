import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { useHideDock } from '../components/layout/shellChrome';
import { useBackHandler } from '../lib/useBackHandler';
import { REBUILD_QUESTIONS } from '../data/rebuildQuestions';
import { PlayView } from '../features/sentenceRebuilder/PlayView';
import { ResultsView } from '../features/sentenceRebuilder/ResultsView';
import { SetupView } from '../features/sentenceRebuilder/SetupView';
import { pickQuestions, poolFor, summarise } from '../features/sentenceRebuilder/engine';
import {
  getBest, getCleanCounts, getLastSetup, masteredCount, recordClean, recordResult, saveLastSetup, type Best,
} from '../features/sentenceRebuilder/store';
import type { Setup } from '../features/sentenceRebuilder/types';
import { useRebuilderRound } from '../features/sentenceRebuilder/useRebuilderRound';

type View = 'setup' | 'play' | 'results';

const DEFAULT_SETUP: Setup = { mode: 'classic', level: 'mixed' };
const ALL_IDS = REBUILD_QUESTIONS.map(q => q.id);

/**
 * Sentence Rebuilder (Design System v2): an English sentence, a scatter of French
 * words, and the job of putting them in order. A game for its own sake — it
 * plays the grammar sentences in `rebuildQuestions.ts` and keeps only a personal
 * best, the last setup and which sentences are mastered, on this device. It
 * deliberately writes no XP, Session, streak, mastery or evidence
 * (`rebuilder.isolation.test.ts`), and a round never touches `AppContext`.
 */
export function SentenceRebuilder() {
  const navigate = useNavigate();
  const round = useRebuilderRound();
  const { game } = round;

  const [view, setView] = useState<View>('setup');
  const [setup, setSetup] = useState<Setup>(() => getLastSetup() ?? DEFAULT_SETUP);
  const [best, setBest] = useState<Best | null>(() => getBest(setup.mode, setup.level));
  const [clean, setClean] = useState(getCleanCounts);
  const [newBest, setNewBest] = useState(false);
  const [newlyMastered, setNewlyMastered] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const recorded = useRef<object | null>(null);

  useHideDock(view === 'play');

  const changeSetup = (next: Setup) => {
    setSetup(next);
    setBest(getBest(next.mode, next.level));
  };

  const begin = (chosen: Setup, only?: string[]) => {
    if (!only) saveLastSetup(chosen);
    // A drill is a calm replay of the misses: never against the clock.
    const used: Setup = only && chosen.mode === 'speed' ? { ...chosen, mode: 'classic' } : chosen;
    const questions = pickQuestions(REBUILD_QUESTIONS, used, getCleanCounts(), Math.random, only);
    if (questions.length === 0) return;
    setNewBest(false);
    setNewlyMastered(0);
    setInterrupted(false);
    recorded.current = null;
    round.start(used, questions, { drill: !!only });
    setView('play');
  };

  // A finished round is stored once, then moves on to the results. Leaving a
  // round half-way stores nothing.
  useEffect(() => {
    if (view !== 'play' || !game || game.phase !== 'over' || recorded.current === game) return;
    recorded.current = game;
    if (game.endedBy === 'left') return;

    const summary = summarise(game);
    const before = masteredCount(ALL_IDS, getCleanCounts());
    recordClean(summary.masteredIds);
    const after = getCleanCounts();
    setClean(after);
    setNewlyMastered(masteredCount(ALL_IDS, after) - before);

    const { mode, level } = game.setup;
    if (!game.drill) {
      setNewBest(recordResult(mode, level, { score: game.score, solved: summary.solved, bestCombo: game.bestCombo }));
      setBest(getBest(mode, level));
    }
    setView('results');
  }, [view, game]);

  const interrupt = () => {
    if (!game || game.phase === 'over') return;
    setInterrupted(true);
    round.pause();
  };
  const keepPlaying = () => {
    setInterrupted(false);
    round.resume();
  };
  const backToSetup = () => {
    round.reset();
    setInterrupted(false);
    setView('setup');
  };

  // Escape asks before leaving a round, and closes that question when it is open.
  useBackHandler(() => {
    if (view !== 'play' || !game) return false;
    if (interrupted || game.phase === 'paused') keepPlaying();
    else interrupt();
    return true;
  });

  const leave = () => navigate('/explore');
  const missed = useMemo(() => {
    if (!game) return [];
    const ids = new Set(summarise(game).missedIds);
    return REBUILD_QUESTIONS.filter(q => ids.has(q.id));
  }, [game]);

  if (view === 'play' && game) {
    const speed = game.setup.mode === 'speed';
    return (
      <>
        <TopContextBar
          title="Sentence Rebuilder"
          subtitle={speed ? 'Speed' : `${game.setup.mode === 'tricky' ? 'Tricky' : 'Classic'}${game.drill ? ' · Drill' : ''}`}
          showBack
          backLabel="Leave round"
          onBack={interrupted || game.phase === 'paused' ? keepPlaying : interrupt}
        />
        <div className="mx-auto w-full max-w-[760px] px-4 pb-8 pt-4 md:px-8">
          <PlayView game={game} round={round} interrupted={interrupted} onPause={interrupt} onKeepPlaying={keepPlaying} onLeave={backToSetup} />
        </div>
      </>
    );
  }

  if (view === 'results' && game) {
    return (
      <>
        <TopContextBar title="Sentence Rebuilder" subtitle="Round summary" showBack backLabel="Back to setup" onBack={backToSetup} />
        <ResultsView
          game={game}
          summary={summarise(game)}
          missed={missed}
          best={best}
          newBest={newBest}
          newlyMastered={newlyMastered}
          onAgain={() => begin(game.drill ? setup : game.setup)}
          onDrill={() => begin(game.setup, missed.map(q => q.id))}
          onSetup={backToSetup}
          onExit={leave}
        />
      </>
    );
  }

  return (
    <>
      <TopContextBar title="Sentence Rebuilder" subtitle="Put the words in order" showBack backLabel="Back to Explore" onBack={leave} />
      <SetupView
        setup={setup}
        onChange={changeSetup}
        best={best}
        inLevel={poolFor(setup.level, REBUILD_QUESTIONS).length}
        mastered={masteredCount(ALL_IDS, clean)}
        totalSentences={REBUILD_QUESTIONS.length}
        onStart={() => begin(setup)}
      />
    </>
  );
}
