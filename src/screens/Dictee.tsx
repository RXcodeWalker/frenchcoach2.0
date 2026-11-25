import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useHideDock } from '../components/layout/shellChrome';
import { useBackHandler } from '../lib/useBackHandler';
import type { DicteeItem } from '../data/dictee';
import { primeVoice, useFrenchVoice, useListener, type Speed } from '../features/dictee/audio';
import {
  createGame, currentItem, giveUp, next, pickRound, poolFor, recordPlay, seededRandom, showMeaning, submit, summarise,
  canPlay, settleSetup, type GameState, type Setup,
} from '../features/dictee/engine';
import { PlayView } from '../features/dictee/PlayView';
import { ResultsView } from '../features/dictee/ResultsView';
import { SetupView } from '../features/dictee/SetupView';
import {
  getBest, getLastSetup, getRecentIds, getSlipIds, noteRecent, recordAttempt, recordBest, saveLastSetup, type Best,
} from '../features/dictee/store';

type View = 'setup' | 'play' | 'results';

const DEFAULT_SETUP: Setup = { format: 'words', level: 'A2', focus: 'any' };

/**
 * Dictée (Design System v2): hear French, type it. A game for its own sake —
 * hand-written lines, a deterministic marker, the recorded voice; no AI, no
 * request to any server. It deliberately writes no XP, Session, streak,
 * mastery or evidence (`dictee.isolation.test.ts`) and never touches
 * `AppContext`: the only thing it keeps is its own local record
 * (`features/dictee/store.ts`).
 */
export function Dictee() {
  const navigate = useNavigate();
  const voice = useFrenchVoice();
  const { playing, listen, stop } = useListener();

  const [view, setView] = useState<View>('setup');
  const [slipIds, setSlipIds] = useState<Set<string>>(() => getSlipIds());
  const [setup, setSetup] = useState<Setup>(() => settleSetup(getLastSetup() ?? DEFAULT_SETUP, slipIds));
  const [best, setBest] = useState<Best | null>(() => getBest(setup.format, setup.level));
  const [game, setGame] = useState<GameState | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** A drill of missed lines is practice: it keeps no best (it is shorter and easier than a round). */
  const [drill, setDrill] = useState(false);
  const recordedAttempts = useRef(0);

  useHideDock(view === 'play');

  const changeSetup = (next: Setup) => {
    setSetup(next);
    setBest(getBest(next.format, next.level));
  };

  /** Every call comes from a tap (Start, Play again, Drill). */
  const begin = useCallback((items: DicteeItem[], from: Setup, isDrill = false) => {
    primeVoice();
    saveLastSetup(from);
    noteRecent(items.map(i => i.id));
    recordedAttempts.current = 0;
    setDrill(isDrill);
    setNewBest(false);
    setConfirmLeave(false);
    setGame(createGame(from, items));
    setView('play');
  }, []);

  const startRound = () => {
    const pool = poolFor(setup, slipIds);
    if (!canPlay(setup, pool)) return;
    begin(pickRound(pool, setup.format, seededRandom(Date.now()), getRecentIds()), setup);
  };

  // Each answer feeds "my slips" the moment it is checked, so leaving mid-round loses nothing.
  useEffect(() => {
    if (!game) return;
    for (let i = recordedAttempts.current; i < game.attempts.length; i++) {
      const a = game.attempts[i];
      recordAttempt(a.item.id, !a.skipped && a.verdict.perfect);
    }
    recordedAttempts.current = game.attempts.length;
  }, [game]);

  // The round is over: keep the best, then show the results.
  const finished = view === 'play' && game?.phase === 'over';
  useEffect(() => {
    if (!finished || !game) return;
    stop();
    const s = summarise(game);
    const result: Best = { score: s.score, stars: s.stars, accuracy: Math.round(s.accuracy * 100) };
    // "My slips" rounds mix levels, and a drill is short: neither has a best to keep.
    const keepsBest = !drill && game.setup.focus !== 'slips';
    setNewBest(keepsBest ? recordBest(game.setup.format, game.setup.level, result) : false);
    setBest(getBest(game.setup.format, game.setup.level));
    setSlipIds(getSlipIds());
    setView('results');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const hear = useCallback(
    (speed: Speed) => {
      setGame(g => (g ? recordPlay(g) : g));
      const line = game ? currentItem(game) : null;
      if (line) void listen(line.fr, speed);
    },
    [game, listen],
  );

  // Back (Escape, the browser's Back, the top bar) asks before dropping a round in progress.
  const inRound = view === 'play' && !!game && game.phase !== 'over';
  useBackHandler(() => {
    if (!inRound) return false;
    setConfirmLeave(true);
    return true;
  }, inRound);

  const leave = () => {
    stop();
    navigate('/explore');
  };
  const toSetup = () => {
    stop();
    setConfirmLeave(false);
    setGame(null);
    // the round may have emptied My slips: don't leave the picker on a focus with nothing in it
    const fresh = getSlipIds();
    setSlipIds(fresh);
    changeSetup(settleSetup(setup, fresh));
    setView('setup');
  };

  const summary = useMemo(() => (game && view === 'results' ? summarise(game) : null), [game, view]);

  if (view === 'play' && game) {
    return (
      <>
        <TopContextBar title="Dictée" subtitle="Listen, then type" showBack backLabel="Leave round" onBack={() => setConfirmLeave(true)} />
        <PlayView
          game={game}
          playing={playing}
          onListen={hear}
          onMeaning={() => setGame(g => (g ? showMeaning(g) : g))}
          onSubmit={typed => {
            stop();
            setGame(g => (g ? submit(g, typed) : g));
          }}
          onGiveUp={() => {
            stop();
            setGame(g => (g ? giveUp(g) : g));
          }}
          onNext={() => setGame(g => (g ? next(g) : g))}
          onLeave={() => setConfirmLeave(true)}
        />
        <Modal
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title="Leave this round?"
          footer={
            <>
              <Button variant="quiet" onClick={() => setConfirmLeave(false)} data-testid="dictee-stay">Keep playing</Button>
              <Button variant="danger" onClick={toSetup} data-testid="dictee-leave">Leave round</Button>
            </>
          }
        >
          <p className="text-[14px] leading-[1.55] text-ink-muted">
            Lines you've already checked are kept in My slips. The score for this round won't be saved.
          </p>
        </Modal>
      </>
    );
  }

  if (view === 'results' && game && summary) {
    const slipItems = summary.slips.map(a => a.item);
    return (
      <>
        <TopContextBar title="Dictée" subtitle="Round summary" showBack backLabel="Back to setup" onBack={toSetup} />
        <ResultsView
          summary={summary}
          best={best}
          newBest={newBest}
          noun={game.setup.format === 'words' ? 'word' : 'sentence'}
          onAgain={() => {
            const pool = poolFor(game.setup, getSlipIds());
            if (canPlay(game.setup, pool)) begin(pickRound(pool, game.setup.format, seededRandom(Date.now()), getRecentIds()), game.setup);
            else toSetup();
          }}
          onDrill={() => begin(pickRound(slipItems, game.setup.format, seededRandom(Date.now())), game.setup, true)}
          onSetup={toSetup}
          onExit={leave}
        />
      </>
    );
  }

  return (
    <>
      <TopContextBar title="Dictée" subtitle="Hear it, then type it" showBack backLabel="Back to Explore" onBack={leave} />
      <SetupView setup={setup} onChange={changeSetup} best={best} slipIds={slipIds} voice={voice} onStart={startRound} />
    </>
  );
}
