import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopContextBar } from '../components/TopContextBar';
import { PageShell } from '../components/layout/PageShell';
import { buildFluencyProfile } from '../domain/fluency/fluencyProfile';
import { firstTakeTrend } from '../domain/fluency/drill432';
import { FluencyView } from '../features/fluency/FluencyView';
import { TRAINER_TITLE } from '../features/fluency/fluencyCopy';
import { loadFlowSamples } from '../features/fluency/flowSource';
import { getDrillHistory } from '../services/fluency/drillStore';

/** `/fluency` — the fluency view (fluency-trainer §2). Reads only; writes nothing. */
export function Fluency() {
  const navigate = useNavigate();
  const profile = useMemo(() => buildFluencyProfile(loadFlowSamples()), []);
  const drills = useMemo(() => getDrillHistory(), []);
  const firstTake = useMemo(() => firstTakeTrend(drills), [drills]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title={TRAINER_TITLE} subtitle="Speed and pauses" showBack backLabel="Back" onBack={() => navigate(-1)} />
      <PageShell maxWidth="md">
        <FluencyView
          profile={profile}
          drills={drills}
          firstTake={firstTake}
          onStartDrill={(topicKey) => navigate(topicKey ? `/fluency/drill?topic=${encodeURIComponent(topicKey)}` : '/fluency/drill')}
        />
      </PageShell>
    </div>
  );
}

export default Fluency;
