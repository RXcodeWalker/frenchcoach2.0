import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { Table, type Column } from '../../components/ui/Table';
import {
  TOTAL_MARKS,
  TREND_MIN_ATTEMPTS,
  assignmentStatus,
  commonSlips,
  isCountedAttempt,
  studentExamSummary,
  topicStats,
} from '../../domain/teacher/classInsights';
import { getStudentSessions, teacherErrorMessage, type ExamAttemptRow, type StudentSessionRow } from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';
import { EmptyState, Metric } from './teachShared';
import { CLASS_WINDOW_DAYS, EYEBROW, cardTitle, relativeDay, shortDate, topicName } from './teachUtils';
import { useClassData } from './useClassData';

/** Counted /40s as dots on a 0–40 line — no smoothed trend line (too little data to draw one honestly). */
function MarkDots({ attempts }: { attempts: ExamAttemptRow[] }) {
  const w = 320;
  const h = 72;
  const pad = 10;
  if (attempts.length === 0) return null;
  const step = attempts.length > 1 ? (w - 2 * pad) / (attempts.length - 1) : 0;
  const y = (total: number) => h - pad - (total / TOTAL_MARKS) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[360px]" role="img" aria-label={`Counted marks: ${attempts.map((a) => a.total).join(', ')} out of ${TOTAL_MARKS}`}>
      <line x1={pad} x2={w - pad} y1={y(TOTAL_MARKS / 2)} y2={y(TOTAL_MARKS / 2)} stroke="var(--hairline)" strokeDasharray="3 3" />
      {attempts.map((a, i) => (
        <g key={a.attemptId}>
          <circle cx={attempts.length > 1 ? pad + i * step : w / 2} cy={y(a.total)} r={5} fill="var(--action)" />
          <text x={attempts.length > 1 ? pad + i * step : w / 2} y={y(a.total) - 9} textAnchor="middle" fontSize="12" fill="var(--ink-muted)">{a.total}</text>
        </g>
      ))}
    </svg>
  );
}

/** `/teach/class/:classId/student/:studentId` — one student's practice since joining. */
export function TeachStudent() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();
  const { data, error } = useClassData(classId);
  const [sessions, setSessions] = useState<StudentSessionRow[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || !studentId) return;
    let cancelled = false;
    getStudentSessions(classId, studentId, new Date(Date.now() - CLASS_WINDOW_DAYS * 86_400_000))
      .then((rows) => { if (!cancelled) setSessions(rows); })
      .catch((err) => { if (!cancelled) setSessionsError(teacherErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [classId, studentId]);

  const member = data?.roster.find((r) => r.studentId === studentId && r.status === 'active');
  const name = member?.displayName?.trim() || 'Unnamed student';
  const exams = useMemo(() => data?.exams.filter((e) => e.studentId === studentId) ?? [], [data, studentId]);
  const summary = useMemo(() => studentExamSummary(studentId ?? '', exams), [studentId, exams]);
  const slips = useMemo(() => commonSlips(exams), [exams]);
  const topics = useMemo(() => topicStats(data?.activity.filter((a) => a.studentId === studentId) ?? []), [data, studentId]);
  const homework = useMemo(
    () => (data ? data.assignments.map((a) => ({ a, cell: assignmentStatus(a, data.roster, data.progress).cells.find((c) => c.studentId === studentId) })).filter((x) => x.cell) : []),
    [data, studentId],
  );

  useEffect(() => {
    if (data && member) track({ name: 'teacher_dashboard_viewed', props: { tab: 'student', students: 1 } });
  }, [data, member]);

  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return <p className="text-body-s text-ink-muted">Loading…</p>;
  if (!member) {
    return (
      <div className="flex flex-col gap-3">
        <InlineAlert>This student isn't in the class any more, so their practice is no longer visible.</InlineAlert>
        <Link to={`/teach/class/${classId}`} className="text-label text-action-text">Back to the class</Link>
      </div>
    );
  }

  const examColumns: Column<ExamAttemptRow>[] = [
    { header: 'Date', cell: (e) => shortDate(e.createdAt), width: '130px' },
    {
      header: 'Kind',
      cell: (e) => (isCountedAttempt(e) ? 'Exam Sim' : <span className="text-ink-subtle">Practice — not counted</span>),
    },
    { header: 'Role play', cell: (e) => `${e.rolePlay}/${e.rolePlayMax}`, numeric: true, width: '84px' },
    { header: 'Comm.', cell: (e) => `${e.communication}/15`, numeric: true, width: '70px' },
    { header: 'Lang.', cell: (e) => `${e.qualityOfLanguage}/15`, numeric: true, width: '70px' },
    {
      header: `/${TOTAL_MARKS}`,
      cell: (e) => (
        <span>
          {e.total}
          {e.teacherTotal !== null && e.teacherTotal !== e.total && <span className="text-caption text-info-text"> · you {e.teacherTotal}</span>}
        </span>
      ),
      numeric: true,
      width: '110px',
    },
  ];

  const learnRows = (sessions ?? []).filter((s) => s.mode !== 'exam');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/teach/class/${classId}`} className="inline-flex items-center gap-1 text-label text-ink-muted hover:text-ink">
          <ChevronLeft size={16} aria-hidden="true" /> {data.klass.name}
        </Link>
        <p className={`${EYEBROW} mt-3`}>Joined {shortDate(member.joinedAt)}</p>
        <h1 className="text-title text-ink mt-1">{name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric value={summary.latest ?? '—'} label={`Latest counted /${TOTAL_MARKS}`} note={`${summary.counted.length} counted ${summary.counted.length === 1 ? 'mock' : 'mocks'}`} />
        <Metric value={summary.best ?? '—'} label="Best" />
        <Metric value={summary.median ?? '—'} label="Median" />
        <Metric
          value={summary.change === null ? '—' : `${summary.change > 0 ? '+' : ''}${summary.change}`}
          label="Change"
          note={summary.change === null ? `Needs ${TREND_MIN_ATTEMPTS} counted mocks` : 'First to latest counted mock'}
        />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="exams-h">
        <h2 id="exams-h" className="text-section text-ink">Mock exams</h2>
        {exams.length === 0 ? (
          <EmptyState title="No marked mock exams since joining" />
        ) : (
          <>
            <MarkDots attempts={summary.counted} />
            <Table
              columns={examColumns}
              rows={[...exams].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
              rowKey={(e) => e.attemptId}
              onRowClick={(e) => navigate(`/teach/class/${classId}/attempt/${encodeURIComponent(e.attemptId)}`)}
            />
            <p className="text-caption text-ink-subtle">AI marks. Open an attempt to read the transcript and agree or adjust each mark.</p>
          </>
        )}
      </section>

      {slips.categories.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="slips-h">
          <h2 id="slips-h" className="text-section text-ink">Most frequent slips</h2>
          <ul className="flex flex-col gap-1">
            {slips.categories.slice(0, 4).map((c) => (
              <li key={c.category} className="text-body-s text-ink-muted">
                <span className="text-ink font-semibold">{c.label}</span> · {c.occurrences}× — e.g. <span className="text-correction-text">{c.examples[0]?.quote}</span> → <span className="text-progress-text">{c.examples[0]?.correction}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {homework.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="hw-h">
          <h2 id="hw-h" className="text-section text-ink">Homework</h2>
          <div className="overflow-hidden rounded-card border border-hairline">
            {homework.map(({ a, cell }) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 first:border-t-0">
                <span className="text-body-s text-ink">{a.title}</span>
                <span className="text-caption text-ink-muted">{cell!.state.replace('_', ' ')} · {cell!.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="learn-h">
        <h2 id="learn-h" className="text-section text-ink">Practice answers</h2>
        {topics.length > 0 && (
          <p className="text-caption text-ink-muted">
            Topics: {topics.map((t) => `${topicName(t.topicKey)} (${t.answers})`).join(' · ')}
          </p>
        )}
        {sessionsError && <InlineAlert>{sessionsError}</InlineAlert>}
        {sessions === null && !sessionsError ? (
          <p className="text-body-s text-ink-muted">Loading answers…</p>
        ) : learnRows.length === 0 ? (
          <EmptyState title="No practice answers since joining" />
        ) : (
          <ul className="flex flex-col gap-2">
            {learnRows.slice(0, 40).map((s) => {
              const fb = s.feedback ?? {};
              const summaryLine = typeof fb.biggest_opportunity === 'string' ? fb.biggest_opportunity : typeof fb.examiner_oneLiner === 'string' ? fb.examiner_oneLiner : null;
              const open = openSession === s.id;
              const kind = s.mode === 'practice' ? topicName(s.topicKey) : s.mode === 'story' ? 'Role-play drill' : s.mode.replace('_', ' ');
              return (
                <li key={s.id} className="rounded-card border border-hairline bg-surface">
                  <button type="button" aria-expanded={open} onClick={() => setOpenSession(open ? null : s.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
                    <div className="min-w-0">
                      <p className="text-caption text-ink-subtle">{relativeDay(s.createdAt)} · {kind}{s.assignmentId ? ' · homework' : ''}</p>
                      <p className="text-body-s text-ink mt-0.5 truncate">{s.questionText || cardTitle(null)}</p>
                    </div>
                    <span className="shrink-0 font-numeral tabular-nums text-ink">{s.score === null ? '—' : `${s.score}/10`}</span>
                  </button>
                  {open && (
                    <div className="border-t border-hairline px-4 py-3 text-body-s">
                      <p className="text-eyebrow uppercase text-ink-subtle">What they said</p>
                      <p className="text-ink mt-1 whitespace-pre-wrap">{s.transcript || '—'}</p>
                      {summaryLine && (
                        <>
                          <p className="text-eyebrow uppercase text-ink-subtle mt-3">Main thing to work on (AI)</p>
                          <p className="text-ink-muted mt-1">{summaryLine}</p>
                        </>
                      )}
                      <p className="text-caption text-ink-subtle mt-3">{s.wordCount} words · {Math.round(s.durationSec)} s</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-caption text-ink-subtle">
          Transcripts are kept up to 2,000 characters. Recordings are not stored. Notes the student keeps privately (their notebook, sound practice) are never shared.
        </p>
      </section>
    </div>
  );
}
