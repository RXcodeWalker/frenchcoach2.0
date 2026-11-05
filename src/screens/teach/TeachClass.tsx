import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Tabs } from '../../components/ui/Tabs';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { track } from '../../services/telemetry/telemetryService';
import { EYEBROW } from './teachUtils';
import { useClassData } from './useClassData';
import { ClassWeekTab } from './ClassWeekTab';
import { ClassInsightsTab } from './ClassInsightsTab';
import { ClassHomeworkTab } from './ClassHomeworkTab';
import { ClassStudentsTab } from './ClassStudentsTab';

type TabId = 'week' | 'insights' | 'homework' | 'students';

const TABS: { id: TabId; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'insights', label: 'Insights' },
  { id: 'homework', label: 'Homework' },
  { id: 'students', label: 'Students & code' },
];

function isTab(v: string | null): v is TabId {
  return v === 'week' || v === 'insights' || v === 'homework' || v === 'students';
}

/** `/teach/class/:classId` — one class, four questions: who's practising, what to teach, homework, the class itself. */
export function TeachClass() {
  const { classId } = useParams();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: TabId = isTab(requested) ? requested : 'week';
  const { data, error, loading, reload } = useClassData(classId);

  const activeCount = useMemo(() => data?.roster.filter((r) => r.status === 'active').length ?? 0, [data]);

  useEffect(() => {
    if (data) track({ name: 'teacher_dashboard_viewed', props: { tab, students: activeCount } });
  }, [tab, data, activeCount]);

  if (loading && !data) return <p className="text-body-s text-ink-muted">Loading the class…</p>;
  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <InlineAlert>{error ?? "This class couldn't be loaded."}</InlineAlert>
        <Link to="/teach" className="text-label text-action-text">Back to your classes</Link>
      </div>
    );
  }

  // A brand-new class has nobody in it yet: send the teacher to the code first.
  const effectiveTab: TabId = activeCount === 0 && !requested ? 'students' : tab;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link to="/teach" className="inline-flex items-center gap-1 text-label text-ink-muted hover:text-ink">
          <ChevronLeft size={16} aria-hidden="true" /> Classes
        </Link>
        <p className={`${EYEBROW} mt-3`}>{data.klass.examYear ? `Exam ${data.klass.examYear}` : 'Class'} · {activeCount} {activeCount === 1 ? 'student' : 'students'}{data.klass.myRole === 'co_teacher' ? ` · Co-teacher with ${data.klass.ownerName ?? 'the owner'}` : ''}</p>
        <h1 className="text-title text-ink mt-1">{data.klass.name}</h1>
      </div>
      <Tabs
        tabs={TABS}
        value={effectiveTab}
        onChange={(id) => {
          const next = new URLSearchParams(params);
          next.set('tab', id);
          setParams(next, { replace: true });
        }}
      />
      {effectiveTab === 'week' && <ClassWeekTab data={data} />}
      {effectiveTab === 'insights' && <ClassInsightsTab data={data} />}
      {effectiveTab === 'homework' && <ClassHomeworkTab data={data} onChanged={reload} />}
      {effectiveTab === 'students' && <ClassStudentsTab data={data} onChanged={reload} />}
    </div>
  );
}
