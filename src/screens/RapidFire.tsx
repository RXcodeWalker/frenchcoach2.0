import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { RapidFirePlay } from '../features/rapidFire/RapidFirePlay';
import { RapidFireResults } from '../features/rapidFire/RapidFireResults';
import { RapidFireSetup } from '../features/rapidFire/RapidFireSetup';
import { recordRun, type BestUpdate } from '../features/rapidFire/bests';
import { RUN_SECONDS, missedWords, type RunMode, type RunSummary } from '../features/rapidFire/run';
import { getWordSets, type RapidFireWord } from '../features/rapidFire/wordBank';

type View =
  | { name: 'setup' }
  | { name: 'play'; runId: number; mode: RunMode; words: RapidFireWord[] }
  | { name: 'results'; summary: RunSummary; bestUpdate: BestUpdate };

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

  const begin = useCallback((mode: RunMode, words: RapidFireWord[]) => {
    setRunCount(n => n + 1);
    setView({ name: 'play', runId: runCount + 1, mode, words });
  }, [runCount]);

  const finish = useCallback((summary: RunSummary) => {
    setView({ name: 'results', summary, bestUpdate: recordRun(setId, summary) });
  }, [setId]);

  if (view.name === 'play') {
    return (
      <>
        <TopContextBar
          title="Rapid Fire"
          subtitle={view.mode === 'drill' ? 'Missed words' : set.label}
          showBack
          backLabel="Leave this run"
          onBack={() => setView({ name: 'setup' })}
        />
        <RapidFirePlay key={view.runId} words={view.words} mode={view.mode} onFinish={finish} />
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
          setLabel={set.label}
          bestUpdate={view.bestUpdate}
          onPlayAgain={() => begin('sprint', set.words)}
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
      <RapidFireSetup sets={sets} selectedId={set.id} onSelect={setSetId} onStart={() => begin('sprint', set.words)} />
    </>
  );
}
