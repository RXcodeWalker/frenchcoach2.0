import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { PageShell } from '../components/layout/PageShell';
import { TOPICS } from '../data/topics';
import { getQuestionById, getRandomQuestion, getTopicCounts } from '../data/questions';
import type { DrillRecord } from '../domain/fluency/drill432';
import { DrillPicker } from '../features/fluency/DrillPicker';
import { DrillRunner, type DrillQuestion } from '../features/fluency/DrillRunner';
import { DrillSummaryView } from '../features/fluency/DrillSummaryView';
import { DRILL_TITLE } from '../features/fluency/fluencyCopy';
import { recentSpokenQuestionIds } from '../features/fluency/flowSource';
import { saveDrill } from '../services/fluency/drillStore';
import type { Question } from '../types';

/**
 * `/fluency/drill` — the 4-3-2 drill (fluency-trainer §3): pick a question,
 * run three rounds, see what changed. The only write is the drill's own
 * local record (`drillStore`).
 */

type View =
  | { kind: 'pick' }
  | { kind: 'run'; question: DrillQuestion; nonce: number }
  | { kind: 'summary'; question: DrillQuestion; record: DrillRecord };

/** Topics with enough Learn questions to pick from. */
const MIN_TOPIC_QUESTIONS = 5;

export function FluencyDrill() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [view, setView] = useState<View>({ kind: 'pick' });

  const recent = useMemo(
    () => recentSpokenQuestionIds().map((id) => getQuestionById(id)).filter((q): q is Question => !!q),
    [],
  );
  const topicKeys = useMemo(() => {
    const counts = getTopicCounts();
    return TOPICS.filter((t) => (counts[t.key] ?? 0) >= MIN_TOPIC_QUESTIONS).map((t) => t.key);
  }, []);
  // Warm-up or exam-level questions: the time pressure is for flow, not for finding ideas.
  const randomQuestion = useCallback((topicKey: string, excludeIds: string[]) => getRandomQuestion(topicKey, excludeIds, 2), []);

  const onFinished = useCallback((record: DrillRecord) => {
    if (record.rounds.length > 0) saveDrill(record);
    setView((v) => (v.kind === 'run' ? { kind: 'summary', question: v.question, record } : v));
  }, []);

  const back = () => {
    if (view.kind === 'run') setView({ kind: 'pick' });
    else navigate('/fluency');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar
        title={DRILL_TITLE}
        subtitle="60 s → 45 s → 30 s"
        showBack
        backLabel={view.kind === 'run' ? 'Leave the drill' : 'Back'}
        onBack={back}
      />
      <PageShell maxWidth="md">
        {view.kind === 'pick' && (
          <DrillPicker
            recent={recent}
            initialTopic={params.get('topic')}
            randomQuestion={randomQuestion}
            topicKeys={topicKeys}
            onStart={(question) => setView({ kind: 'run', question, nonce: Date.now() })}
          />
        )}
        {view.kind === 'run' && <DrillRunner key={view.nonce} question={view.question} onFinished={onFinished} />}
        {view.kind === 'summary' && (
          <DrillSummaryView
            record={view.record}
            onAgain={() => setView({ kind: 'run', question: view.question, nonce: Date.now() })}
            onNewQuestion={() => setView({ kind: 'pick' })}
            onBack={() => navigate('/fluency')}
          />
        )}
      </PageShell>
    </div>
  );
}

export default FluencyDrill;
