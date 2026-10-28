import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { MonthlyCheck } from '../features/pronunciation/MonthlyCheck';

/**
 * `/learn/sounds/check` — the Pronunciation Lab's monthly check (plan §3.3).
 * Behind the `pronunciationLab` flag (App.tsx's ComingSoonGate). The check
 * itself is `features/pronunciation/MonthlyCheck.tsx`; this is only its page.
 */
export function MonthlyCheckScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Monthly sound check" subtitle="The same five sentences, once a month" />
      <PageShell>
        <MonthlyCheck onDone={() => navigate('/progress')} />
      </PageShell>
    </div>
  );
}
