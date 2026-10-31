import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { RapidFirePlay } from '../features/rapidFire/RapidFirePlay';
import { RapidFireResults } from '../features/rapidFire/RapidFireResults';
import { RapidFireSetup } from '../features/rapidFire/RapidFireSetup';
import { recordRun, type BestUpdate } from '../features/rapidFire/bests';
import { MIN_MISSED_FOR_SPRINT, missedInSet, recordMissed } from '../features/rapidFire/missed';
import { RUN_SECONDS, missedWords, type RunMode, type RunSummary } from '../features/rapidFire/run';
import { getWordSets, type RapidFireWord } from '../features/rapidFire/wordBank';

/** `set`: the whole word set. `missed`: only the cards missed before (never touches the set's best). */
type Pool = 'set' | 'missed';

type View =
  | { name: 'setup' }
  | { name: 'play'; runId: number; mode: RunMode; pool: Pool; words: RapidFireWord[] }
  | { name: 'results'; summary: RunSummary; pool: Pool; bestUpdate: BestUpdate };

/**
 * Rapid Fire: a 60-second typed-translation sprint (Design System v2).
 * Setup → 3-2-1 → run → results, with an optional drill of the words missed.
 *
 * Points are only a game score. This screen deliberately takes nothing from
 * `AppContext` — no XP, no session, no streak, no mastery — until the owner
 * decides Rapid Fire should count (see `features/rapidFire/noXp.test.ts`).
 */
export function RapidFire() {
  const navigate = useNavigate();
  const sets = useMemo(() => getWordSets(), []);
  const [setId, setSetId] = useState(sets[0].id);
  const [view, setView] = useState<View>({ name: 'setup' });
  const [runCount, setRunCount] = useState(0);
  const set = sets.find(s => s.id === setId) ?? sets[0];

  // Re-read whenever the screen changes view, so a finished run updates the count.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const missed = useMemo(() => missedInSet(set), [set, view.name]);

  const begin = useCallback((mode: RunMode, words: RapidFireWord[], pool: Pool = 'set') => {
    setRunCount(n => n + 1);
    setView({ name: 'play', runId: runCount + 1, mode, pool, words });
  }, [runCount]);

  const beginPool = useCallback((pool: Pool) => {
    begin('sprint', pool === 'missed' ? missedInSet(set) : set.words, pool);
  }, [begin, set]);

  const finish = useCallback((summary: RunSummary, pool: Pool) => {
    recordMissed(summary.log);
    // A missed-cards sprint is a different pool, so it can't set the word set's best.
    const bestUpdate = pool === 'missed' ? { previous: undefined, isNewBest: false } : recordRun(setId, summary);
    setView({ name: 'results', summary, pool, bestUpdate });
  }, [setId]);

  if (view.name === 'play') {
    return (
      <>
        <TopContextBar
          title="Rapid Fire"
          subtitle={view.mode === 'drill' ? 'Missed words' : view.pool === 'missed' ? `Missed cards · ${set.label}` : set.label}
          showBack
          backLabel="Leave this run"
          onBack={() => setView({ name: 'setup' })}
        />
        <RapidFirePlay key={view.runId} words={view.words} mode={view.mode} onFinish={summary => finish(summary, view.pool)} />
      </>
    );
  }

  if (view.name === 'results') {
    const { summary } = view;
    return (
      <>
        <TopContextBar
          title="Rapid Fire"
          subtitle="Run complete"
          showBack
          backLabel="Back to word sets"
          onBack={() => setView({ name: 'setup' })}
        />
        <RapidFireResults
          summary={summary}
          setLabel={summary.mode === 'sprint' && view.pool === 'missed' ? `${set.label} (missed cards)` : set.label}
          bestUpdate={view.bestUpdate}
          onPlayAgain={() => beginPool(view.pool)}
          onDrill={() => begin('drill', missedWords(summary.log))}
          onChangeSet={() => setView({ name: 'setup' })}
          onExit={() => navigate('/explore')}
        />
      </>
    );
  }

  return (
    <>
      <TopContextBar
        title="Rapid Fire"
        subtitle={`${RUN_SECONDS}-second translation sprint`}
        showBack
        backLabel="Back to Explore"
        onBack={() => navigate('/explore')}
      />
      <RapidFireSetup
        sets={sets}
        selectedId={set.id}
        onSelect={setSetId}
        onStart={() => beginPool('set')}
        missedCount={missed.length}
        minMissed={MIN_MISSED_FOR_SPRINT}
        onStartMissed={() => beginPool('missed')}
      />
    </>
  );
}
