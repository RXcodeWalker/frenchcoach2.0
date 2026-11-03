import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { Table, type Column } from '../../components/ui/Table';
import { Segmented } from '../../components/ui/Segmented';
import { Button } from '../../components/ui/Button';
import { buildWeekRows, summariseWeek, TOTAL_MARKS, type WeekStudentRow } from '../../domain/teacher/classInsights';
import { weekRange } from '../../domain/teacher/week';
import { EmptyState, Metric } from './teachShared';
import { relativeDay } from './teachUtils';
import { type ClassData } from './useClassData';

type Which = 'this' | 'last';

/** Q1 — who is practising, and who isn't. Least active first. */
export function ClassWeekTab({ data }: { data: ClassData }) {
  const navigate = useNavigate();
  const [which, setWhich] = useState<Which>('this');
  const [copied, setCopied] = useState(false);
  const week = useMemo(() => weekRange(new Date(), data.klass.timezone, which === 'this' ? 0 : 1), [data.klass.timezone, which]);
  const rows = useMemo(() => buildWeekRows(data.roster, data.activity, data.exams, week), [data, week]);
  const summary = useMemo(() => summariseWeek(rows, data.exams, week), [rows, data.exams, week]);

  if (rows.length === 0) {
    return (
      <EmptyState title="No students yet">
        Share the class code from <span className="font-semibold">Students &amp; code</span>. Their practice shows up here from the moment they join.
      </EmptyState>
    );
  }

  const columns: Column<WeekStudentRow>[] = [
    {
      header: 'Student',
      cell: (r) => (
        <span className={r.practisedThisWeek ? 'text-ink' : 'text-correction-text font-semibold'}>
          {r.name}
          {!r.practisedThisWeek && <span className="sr-only"> (no practice this week)</span>}
        </span>
      ),
    },
    { header: 'Last active', cell: (r) => relativeDay(r.lastActiveAt), width: '110px' },
    { header: 'Answers', cell: (r) => r.answersThisWeek, numeric: true, width: '78px' },
    { header: 'Minutes', cell: (r) => r.minutesThisWeek, numeric: true, width: '78px' },
    {
      header: 'Mocks',
      cell: (r) => (
        <span title={r.practiceExamsThisWeek > 0 ? `${r.practiceExamsThisWeek} practice (not counted)` : undefined}>
          {r.countedExamsThisWeek}
          {r.practiceExamsThisWeek > 0 && <span className="text-ink-subtle"> +{r.practiceExamsThisWeek}</span>}
        </span>
      ),
      numeric: true,
      width: '78px',
    },
    {
      header: `Latest /${TOTAL_MARKS}`,
      cell: (r) =>
        r.latestCounted ? (
          <span>
            {r.latestCounted.total}
            <span className="text-ink-subtle text-caption"> ({r.latestCounted.n})</span>
          </span>
        ) : (
          <span className="text-ink-subtle">—</span>
        ),
      numeric: true,
      width: '96px',
    },
  ];

  const copyNames = async () => {
    try {
      await navigator.clipboard.writeText(summary.notPractisedNames.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the names are on screen */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Which>
          label="Which week"
          height={36}
          className="w-full max-w-[280px]"
          value={which}
          onChange={setWhich}
          options={[{ id: 'this', label: 'This week' }, { id: 'last', label: 'Last week' }]}
        />
        <p className="text-caption text-ink-subtle">
          Monday to Sunday, {data.klass.timezone.replace('_', ' ')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric value={`${summary.practised}/${summary.activeStudents}`} label="Practised" note="Any speaking practice" />
        <Metric value={summary.totalAnswers} label="Answers" note={`${summary.totalMinutes} min speaking`} />
        <Metric value={summary.countedExams} label="Counted mock exams" note="Exam Sim only" />
        <Metric
          value={summary.medianCounted === null ? '—' : summary.medianCounted}
          label={`Median /${TOTAL_MARKS}`}
          note={summary.countedExams === 0 ? 'No counted mocks yet' : `From ${summary.countedExams} ${summary.countedExams === 1 ? 'attempt' : 'attempts'}`}
        />
      </div>

      {summary.notPractisedNames.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-correction-soft px-4 py-3">
          <p className="text-body-s text-correction-text">
            <span className="font-semibold">{summary.notPractisedNames.length} haven't practised</span>
            {which === 'this' ? ' this week' : ' last week'}: {summary.notPractisedNames.join(', ')}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void copyNames()}>
            <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy names'}
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.studentId}
        onRowClick={(r) => navigate(`/teach/class/${data.klass.id}/student/${r.studentId}`)}
      />
      <p className="text-caption text-ink-subtle">
        Mocks: counted Exam Sim attempts, with practice (Coached, edited or typed) ones after the +. Latest mark is the
        most recent counted mock, with how many there are in brackets. Activity before a student joined is never shown.
      </p>
    </div>
  );
}
