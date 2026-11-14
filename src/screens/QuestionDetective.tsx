import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { useHideDock } from '../components/layout/shellChrome';
import { useBackHandler } from '../lib/useBackHandler';
import { caseById } from '../data/questionWords/cases';
import type { WordId } from '../data/questionWords/types';
import { AskView } from '../features/questionDetective/AskView';
import { CaseView } from '../features/questionDetective/CaseView';
import { mixupSummary } from '../features/questionDetective/copy';
import {
  readDetectiveStore,
  recordAnswerRound,
  recordAskRound,
  recordCaseSolved,
  recordMixup,
  saveLadder,
} from '../features/questionDetective/detectiveStore';
import { buildRound, buildTrickyRound, parseWordFilter } from '../features/questionDetective/engine';
import { parseMixupKey } from '../features/questionDetective/judge';
import { HomeView } from '../features/questionDetective/HomeView';
import { ResultsView } from '../features/questionDetective/ResultsView';
import { RoundView, type RoundLog } from '../features/questionDetective/RoundView';
import { ToolkitView } from '../features/questionDetective/ToolkitView';
import type { LadderMap } from '../features/questionDetective/ladder';
import { mulberry32 } from '../features/questionDetective/rng';

type View =
  | { name: 'home' }
  | { name: 'toolkit' }
  | { name: 'round'; seed: number; kind: 'answer' | 'tricky'; filter: WordId[] | null }
  | { name: 'ask'; seed: number }
  | { name: 'case'; caseId: string }
  | { name: 'results'; kind: 'answer' | 'ask' | 'tricky'; correct: number; total: number; mixupNote: string | null; newBest: boolean };

/**
 * Question Detective (Design System v2): a game for its own sake that teaches
 * what each French question word wants. Writes no XP, Session, mastery or
 * evidence (`detective.isolation.test.ts`).
 */
export function QuestionDetective() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const teacherFilter = useMemo(() => parseWordFilter(params.get('words')), [params]);
  const [view, setView] = useState<View>(() =>
    teacherFilter ? { name: 'round', seed: Date.now(), kind: 'answer', filter: teacherFilter } : { name: 'home' },
  );
  const [store, setStore] = useState(() => readDetectiveStore());

  const playing = view.name === 'round' || view.name === 'ask' || view.name === 'case';
  useHideDock(playing);

  useBackHandler(() => {
    if (view.name === 'home') return false;
    setView({ name: 'home' });
    return true;
  });

  const startAnswer = (filter: WordId[] | null) => {
    setView({ name: 'round', seed: Date.now(), kind: 'answer', filter });
  };

  const startTricky = () => {
    const plan = buildTrickyRound(mulberry32(Date.now()), store.mixups, store.rungs);
    if (!plan) {
      startAnswer(null);
      return;
    }
    setView({ name: 'round', seed: Date.now(), kind: 'tricky', filter: plan.filter });
  };

  const finishRound = (log: RoundLog[], ladder: LadderMap) => {
    saveLadder(ladder);
    let mixups = store.mixups;
    for (const entry of log) {
      if (entry.judgement.verdict === 'mixup' && entry.judgement.givenWord) {
        const next = recordMixup(`${entry.wordId}|${entry.judgement.givenWord}`);
        mixups = next.mixups;
      }
    }
    const correct = log.filter(e => e.judgement.verdict === 'right' || e.judgement.verdict === 'almost').length;
    const before = store.bests.answer;
    const stored = recordAnswerRound(correct);
    const top = Object.entries(mixups).sort((a, b) => b[1] - a[1])[0];
    const parsed = top ? parseMixupKey(top[0]) : null;
    setStore(stored);
    setView({
      name: 'results',
      kind: view.name === 'round' ? view.kind : 'answer',
      correct,
      total: log.length,
      mixupNote: parsed ? mixupSummary(parsed.expected, parsed.given) : null,
      newBest: correct > before,
    });
  };

  const title =
    view.name === 'toolkit' ? 'The toolkit'
    : view.name === 'ask' ? 'Ask it'
    : view.name === 'case' ? 'Case files'
    : view.name === 'round' && view.kind === 'tricky' ? 'Tricky pairs'
    : view.name === 'round' ? 'Answer it'
    : view.name === 'results' ? 'Round over'
    : 'Question Detective';

  return (
    <>
      <TopContextBar
        title={title}
        showBack
        backLabel={view.name === 'home' ? 'Explore' : 'Desk'}
        onBack={() => (view.name === 'home' ? navigate('/explore') : setView({ name: 'home' }))}
      />
      {view.name === 'home' && (
        <HomeView
          store={store}
          onToolkit={() => setView({ name: 'toolkit' })}
          onAnswer={startAnswer}
          onAsk={() => setView({ name: 'ask', seed: Date.now() })}
          onCase={id => setView({ name: 'case', caseId: id })}
          onTricky={startTricky}
        />
      )}
      {view.name === 'toolkit' && <ToolkitView />}
      {view.name === 'round' && (
        <RoundView
          key={view.seed}
          plan={buildRound(mulberry32(view.seed), { ladder: store.rungs, mixups: store.mixups, filter: view.filter })}
          ladder={store.rungs}
          onFinish={finishRound}
        />
      )}
      {view.name === 'ask' && (
        <AskView
          key={view.seed}
          seed={view.seed}
          onFinish={(correct, total) => {
            const before = store.bests.ask;
            setStore(recordAskRound(correct));
            setView({ name: 'results', kind: 'ask', correct, total, mixupNote: null, newBest: correct > before });
          }}
        />
      )}
      {view.name === 'case' && caseById(view.caseId) && (
        <CaseView
          key={view.caseId}
          file={caseById(view.caseId)!}
          onFinish={solved => {
            if (solved) setStore(recordCaseSolved(view.caseId));
            else setStore(readDetectiveStore());
            setView({ name: 'home' });
          }}
        />
      )}
      {view.name === 'results' && (
        <ResultsView
          correct={view.correct}
          total={view.total}
          mixupNote={view.mixupNote}
          newBest={view.newBest}
          onAgain={() => {
            if (view.kind === 'ask') setView({ name: 'ask', seed: Date.now() });
            else if (view.kind === 'tricky') startTricky();
            else startAnswer(teacherFilter);
          }}
          onHome={() => setView({ name: 'home' })}
        />
      )}
    </>
  );
}
