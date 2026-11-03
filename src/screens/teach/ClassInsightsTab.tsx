import { useMemo, useState } from 'react';
import { Segmented } from '../../components/ui/Segmented';
import { areaReport, commonSlips, isCountedAttempt, topicStats } from '../../domain/teacher/classInsights';
import { EmptyState } from './teachShared';
import { EYEBROW, topicName } from './teachUtils';
import { type ClassData } from './useClassData';

type Span = '4w' | 'all';

/** Q2 — what should I teach on Monday? Three panels, each with the evidence behind it. */
export function ClassInsightsTab({ data }: { data: ClassData }) {
  const [span, setSpan] = useState<Span>('4w');
  const [showNames, setShowNames] = useState(false);
  const since = span === '4w' ? Date.now() - 28 * 86_400_000 : 0;
  const exams = useMemo(() => data.exams.filter((e) => new Date(e.createdAt).getTime() >= since), [data.exams, since]);
  const activity = useMemo(() => data.activity.filter((a) => new Date(a.createdAt).getTime() >= since), [data.activity, since]);
  const slips = useMemo(() => commonSlips(exams), [exams]);
  const areas = useMemo(() => areaReport(exams), [exams]);
  const topics = useMemo(() => topicStats(activity), [activity]);
  const nameOf = useMemo(() => new Map(data.roster.map((r) => [r.studentId, r.displayName?.trim() || 'A student'])), [data.roster]);
  const countedCount = exams.filter(isCountedAttempt).length;

  return (
    <div className="flex flex-col gap-6">
      <Segmented<Span>
        label="Time span"
        height={36}
        className="w-full max-w-[320px]"
        value={span}
        onChange={setSpan}
        options={[{ id: '4w', label: 'Last 4 weeks' }, { id: 'all', label: 'Since joining' }]}
      />

      {/* 1. Common slips */}
      <section className="flex flex-col gap-3" aria-labelledby="slips-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={EYEBROW}>Mock exams</p>
            <h2 id="slips-h" className="text-section text-ink mt-1">Common slips</h2>
          </div>
          {slips.categories.length > 0 && (
            <label className="flex items-center gap-2 text-caption text-ink-muted">
              <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
              Show student names on examples
            </label>
          )}
        </div>
        {slips.categories.length === 0 ? (
          <EmptyState title="No categorised slips yet">
            Slips are grouped from each mock exam's report. They appear once students sit Exam Sim and open their report.
            {slips.uncategorisedStudents > 0 && ` ${slips.uncategorisedStudents} ${slips.uncategorisedStudents === 1 ? 'student has' : 'students have'} marked exams without a report yet.`}
          </EmptyState>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {slips.categories.slice(0, 5).map((c, i) => (
                <li key={c.category} className="rounded-card border border-hairline bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-label text-ink">
                      {i + 1}. {c.label}
                    </p>
                    <p className="text-caption text-ink-muted">
                      {c.students} {c.students === 1 ? 'student' : 'students'} · {c.occurrences} {c.occurrences === 1 ? 'time' : 'times'}
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {c.examples.map((ex, j) => (
                      <li key={j} className="text-body-s text-ink-muted">
                        <span className="text-correction-text line-through decoration-1">{ex.quote}</span>
                        {' → '}
                        <span className="text-progress-text font-semibold">{ex.correction}</span>
                        {showNames && <span className="text-caption text-ink-subtle"> — {nameOf.get(ex.studentId) ?? 'A student'}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="text-caption text-ink-subtle">
              From {slips.categorisedAttempts} of {slips.markedAttempts} marked mock exams (only exams whose report was
              opened carry categories). Ranked by how many students made the slip, so one learner's habit can't top the list.
            </p>
          </>
        )}
      </section>

      {/* 2. Area weakness */}
      <section className="flex flex-col gap-3" aria-labelledby="areas-h">
        <div>
          <p className={EYEBROW}>Counted mock exams</p>
          <h2 id="areas-h" className="text-section text-ink mt-1">Where the marks are lost</h2>
        </div>
        {areas.students === 0 ? (
          <EmptyState title="No counted mock exams yet">Medians use Exam Sim attempts only — Coached practice never counts.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {areas.areas.map((a) => (
                <div
                  key={a.area}
                  className={`rounded-card border px-4 py-3 ${a.area === areas.weakest ? 'border-correction bg-correction-soft' : 'border-hairline bg-surface'}`}
                >
                  <p className="text-label text-ink">{a.label}</p>
                  <p className="font-numeral text-num-m text-ink tabular-nums mt-1">
                    {a.median === null ? '—' : a.median}
                    <span className="text-body-s text-ink-subtle">/{a.max}</span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-pill bg-track" aria-hidden="true">
                    <div className="h-1.5 rounded-pill bg-action" style={{ width: `${Math.round((a.fraction ?? 0) * 100)}%` }} />
                  </div>
                  {a.area === areas.weakest && <p className="text-caption text-correction-text mt-2">Furthest below its maximum</p>}
                </div>
              ))}
            </div>
            <p className="text-caption text-ink-subtle">
              Class median of each student's latest counted mock ({areas.students} {areas.students === 1 ? 'student' : 'students'}, {countedCount} counted {countedCount === 1 ? 'attempt' : 'attempts'} in this span).
              AI marks — open an attempt to check one.
            </p>
          </>
        )}
      </section>

      {/* 3. Topics */}
      <section className="flex flex-col gap-3" aria-labelledby="topics-h">
        <div>
          <p className={EYEBROW}>Learn practice</p>
          <h2 id="topics-h" className="text-section text-ink mt-1">Topics practised</h2>
        </div>
        {topics.length === 0 ? (
          <EmptyState title="No Learn answers yet" />
        ) : (
          <div className="overflow-hidden rounded-card border border-hairline">
            {topics.map((t) => (
              <div key={t.topicKey} className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2.5 first:border-t-0">
                <span className="text-body-s text-ink">{topicName(t.topicKey)}</span>
                <span className="text-caption text-ink-muted tabular-nums">
                  {t.answers} {t.answers === 1 ? 'answer' : 'answers'} · {t.students} {t.students === 1 ? 'student' : 'students'}
                  {t.averageScore !== null && ` · avg ${t.averageScore}/10`}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-caption text-ink-subtle">Answers in the Examiner style carry no score, by design, and aren't averaged.</p>
      </section>
    </div>
  );
}
