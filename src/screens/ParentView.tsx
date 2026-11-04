import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, CalendarDays, Clock, Flame, Lightbulb, Lock, MessageCircle, Mic, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import {
  buildParentReport,
  EXAM_TOTAL_MAX,
  WEEKLY_DAYS_TARGET,
  type CalendarDay,
  type Change,
  type ExamCondition,
  type ParentReport,
  type WeekStats,
} from '../features/parentView/buildReport';
import { fetchParentReport, ParentLinkError, tokenFromHash } from '../features/parentView/parentLinkService';

/**
 * The parent view (`/parent#<token>`). Rendered by AppShell before any auth or
 * onboarding gate, so it works for a signed-out parent, a signed-in one, or the
 * learner previewing their own link. Read-only: it never touches app state,
 * storage, analytics or sound. Order is verdict → what to do → evidence.
 */

type Load =
  | { state: 'loading' }
  | { state: 'ready'; report: ParentReport; fetchedAt: Date }
  | { state: 'error'; code: 'missing' | 'invalid' | 'unavailable' | 'network' };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const keyDate = (key: string) => new Date(`${key}T12:00:00`);

function lastActiveText(days: number | null): string {
  if (days === null) return 'No practice yet';
  if (days === 0) return 'Practised today';
  if (days === 1) return 'Last practised yesterday';
  return `Last practised ${days} days ago`;
}

export function ParentView() {
  const [token, setToken] = useState(() => tokenFromHash(window.location.hash));
  const [load, setLoad] = useState<Load>(() => (token ? { state: 'loading' } : { state: 'error', code: 'missing' }));

  useEffect(() => {
    const onHash = () => setToken(tokenFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Parent view · Français AI';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.title = prev;
      meta.remove();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoad({ state: 'error', code: 'missing' });
      return;
    }
    setLoad(l => (l.state === 'ready' ? l : { state: 'loading' }));
    try {
      const raw = await fetchParentReport(token);
      setLoad({ state: 'ready', report: buildParentReport(raw), fetchedAt: new Date() });
    } catch (err) {
      const code = err instanceof ParentLinkError ? err.code : 'unknown';
      setLoad({
        state: 'error',
        code: code === 'invalid_link' ? 'invalid' : code === 'not_available' ? 'unavailable' : 'network',
      });
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-4 pb-16 pt-6 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-numeral text-[15px] text-ink">Français AI</span>
            <span className="text-[13px] text-ink-subtle">· Parent view</span>
          </div>
          {load.state === 'ready' && (
            <Button variant="quiet" size="sm" onClick={() => void refresh()} aria-label="Refresh">
              <RefreshCw size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Updated {load.fetchedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
            </Button>
          )}
        </header>

        {load.state === 'loading' && <LoadingState />}
        {load.state === 'error' && <ErrorState code={load.code} onRetry={() => void refresh()} />}
        {load.state === 'ready' && <Dashboard report={load.report} />}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading progress">
      {[160, 120, 220].map(h => (
        <div key={h} className="rounded-card border border-hairline bg-surface" style={{ height: h }} />
      ))}
    </div>
  );
}

function ErrorState({ code, onRetry }: { code: 'missing' | 'invalid' | 'unavailable' | 'network'; onRetry: () => void }) {
  const copy = {
    missing: { title: 'This page needs a link', body: 'Open the full link your child shared with you. They can make one in Français AI under Profile → Parent view.' },
    invalid: { title: 'This link isn’t working', body: 'It may have been turned off, or part of it is missing. Ask your child for a new link from Profile → Parent view.' },
    unavailable: { title: 'Parent view isn’t switched on yet', body: 'This part of Français AI isn’t available yet. Please try again later.' },
    network: { title: 'Couldn’t load progress', body: 'Check your connection and try again.' },
  }[code];
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-hairline bg-surface p-6" role="alert">
      <AlertCircle size={24} className="text-ink-subtle" aria-hidden="true" />
      <h1 className="text-title text-ink">{copy.title}</h1>
      <p className="text-body-s text-ink-muted">{copy.body}</p>
      {code === 'network' && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </section>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ report }: { report: ParentReport }) {
  return (
    <main className="flex flex-col gap-4">
      <StatusCard report={report} />
      <ThisWeek report={report} />
      <Suggestions report={report} />
      <div className="flex flex-wrap gap-4">
        <ProgressCard report={report} />
        <ExamCard report={report} />
      </div>
      <TopicsCard report={report} />
      <CoachNotes report={report} />
      <AboutCard name={report.learnerName} />
    </main>
  );
}

function Section({ id, title, meta, children, className = '' }: { id: string; title: string; meta?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-4 rounded-card border border-hairline bg-surface p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={id} className="text-section text-ink">{title}</h2>
        {meta && <span className="text-[13px] text-ink-subtle">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

const STATUS_TONE: Record<ParentReport['status']['kind'], { dot: string; label: string }> = {
  steady: { dot: 'var(--progress)', label: 'On track' },
  light: { dot: 'var(--reward)', label: 'Needs a nudge' },
  inactive: { dot: 'var(--correction)', label: 'Stopped' },
  new: { dot: 'var(--ink-subtle)', label: 'Not started' },
};

function StatusCard({ report }: { report: ParentReport }) {
  const tone = STATUS_TONE[report.status.kind];
  return (
    <section aria-labelledby="parent-status" className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 sm:p-6" data-testid="parent-status" data-status={report.status.kind}>
      <p className="text-eyebrow uppercase text-action-text">{report.learnerName}’s French speaking</p>
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-label text-ink-muted">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
          {tone.label}
        </span>
        <h1 id="parent-status" className="text-h2 text-ink [text-wrap:balance]">{report.status.headline}</h1>
        <p className="text-body-base text-ink-muted [text-wrap:pretty]">{report.status.detail}</p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Chip icon={<Clock size={14} aria-hidden="true" />}>{lastActiveText(report.daysSinceActive)}</Chip>
        {report.streakDays > 0 && <Chip icon={<Flame size={14} aria-hidden="true" className="text-streak-text" />}>{report.streakDays}-day streak</Chip>}
      </div>
    </section>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-recessed px-3 py-1 text-[13px] text-ink-muted">
      {icon}
      {children}
    </span>
  );
}

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  const d = now - before;
  if (d === 0) return <span className="text-[13px] text-ink-subtle">Same as the week before</span>;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] ${up ? 'text-progress-text' : 'text-ink-subtle'}`}>
      {up ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />}
      {Math.abs(d)} {unit} {up ? 'more' : 'fewer'} than the week before
    </span>
  );
}

function WeekStat({ label, value, suffix, now, before, unit, field }: { label: string; value: number; suffix?: string; now: WeekStats; before: WeekStats; unit: string; field: keyof WeekStats }) {
  return (
    <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1 rounded-control border border-hairline bg-surface-recessed p-4">
      <span className="text-[13px] text-ink-subtle">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-numeral text-num-m text-ink">{value}</span>
        {suffix && <span className="font-numeral text-[14px] text-ink-subtle">{suffix}</span>}
      </span>
      <Delta now={now[field]} before={before[field]} unit={unit} />
    </div>
  );
}

function ThisWeek({ report }: { report: ParentReport }) {
  const { week, prevWeek } = report;
  return (
    <Section id="parent-week" title="The last 7 days" meta={`Aim: ${WEEKLY_DAYS_TARGET} days a week`}>
      <div className="flex flex-wrap gap-3">
        <WeekStat label="Days practised" value={week.daysPractised} suffix="/7" now={week} before={prevWeek} unit="days" field="daysPractised" />
        <WeekStat label="Practice time" value={week.minutes} suffix="min" now={week} before={prevWeek} unit="min" field="minutes" />
        <WeekStat label="Answers spoken aloud" value={week.answers} now={week} before={prevWeek} unit="answers" field="answers" />
      </div>
      <Calendar days={report.calendar} />
    </Section>
  );
}

const WEEKDAY_FMT = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'narrow' });

function dayLevel(d: CalendarDay): 0 | 1 | 2 {
  if (d.sessions === 0) return 0;
  return d.minutes >= 10 ? 2 : 1;
}

function Calendar({ days }: { days: CalendarDay[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[13px] text-ink-subtle">
        <CalendarDays size={14} aria-hidden="true" /> Last 4 weeks
      </div>
      <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
        {days.slice(0, 7).map(d => (
          <span key={d.key} className="text-center text-caption text-ink-subtle">{WEEKDAY_FMT(keyDate(d.key))}</span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Practice over the last 4 weeks">
        {days.map(d => {
          const level = dayLevel(d);
          const date = keyDate(d.key);
          const label = `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.sessions === 0 ? 'no practice' : `${d.sessions} session${d.sessions === 1 ? '' : 's'}, ${d.minutes} min`}${d.today ? ' (today)' : ''}`;
          return (
            <li
              key={d.key}
              title={label}
              aria-label={label}
              className="flex h-10 items-center justify-center rounded-control font-numeral text-[13px]"
              style={{
                background: level === 0 ? 'var(--surface-recessed)' : 'var(--progress-soft)',
                color: level === 0 ? 'var(--ink-subtle)' : 'var(--progress-text)',
                boxShadow: d.today
                  ? 'inset 0 0 0 1.5px var(--action)'
                  : level === 2
                    ? 'inset 0 0 0 1.5px var(--progress)'
                    : 'inset 0 0 0 1px var(--hairline)',
              }}
            >
              {date.getDate()}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-subtle">
        <LegendSwatch bg="var(--surface-recessed)" ring="var(--hairline)">No practice</LegendSwatch>
        <LegendSwatch bg="var(--progress-soft)" ring="var(--hairline)">Under 10 min</LegendSwatch>
        <LegendSwatch bg="var(--progress-soft)" ring="var(--progress)">10 min or more</LegendSwatch>
      </div>
    </div>
  );
}

function LegendSwatch({ bg, ring, children }: { bg: string; ring: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px]" style={{ background: bg, boxShadow: `inset 0 0 0 1.5px ${ring}` }} />
      {children}
    </span>
  );
}

function Suggestions({ report }: { report: ParentReport }) {
  return (
    <Section id="parent-help" title="How you can help this week">
      <ol className="flex flex-col gap-3">
        {report.suggestions.map((s, i) => (
          <li key={s.id} className="flex gap-3 rounded-control border border-hairline bg-surface-recessed p-4" data-testid={`parent-suggestion-${s.id}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action-soft font-numeral text-[13px] text-action-text" aria-hidden="true">{i + 1}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-label text-ink">{s.title}</p>
              <p className="text-body-s text-ink-muted [text-wrap:pretty]">{s.detail}</p>
              {s.quote && <blockquote className="mt-1 border-l-2 border-hairline-strong pl-3 text-body-s italic text-ink">{s.quote}</blockquote>}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function ChangeLine({ label, change, unit, betterWhen, empty, decimals = 1 }: { label: string; change: Change | null; unit: string; betterWhen: 'up' | 'down'; empty: string; decimals?: number }) {
  if (!change) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-label text-ink">{label}</span>
        <span className="text-body-s text-ink-subtle">{empty}</span>
      </div>
    );
  }
  const good = change.direction !== 'same' && change.direction === betterWhen;
  const Icon = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : ArrowRight;
  const word = change.direction === 'same' ? 'About the same' : good ? 'Better' : 'Worse';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label text-ink">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-numeral text-[18px] text-ink">{change.from.toFixed(decimals)} → {change.to.toFixed(decimals)}</span>
        <span className="text-[13px] text-ink-subtle">{unit}</span>
        <span className={`inline-flex items-center gap-1 text-[13px] ${good ? 'text-progress-text' : 'text-ink-subtle'}`}>
          <Icon size={13} aria-hidden="true" /> {word}
        </span>
      </span>
    </div>
  );
}

const BAR_MAX = 96;

function ProgressCard({ report }: { report: ParentReport }) {
  const { learn, fluency } = report;
  const anyScores = learn.weeks.some(w => w.avg !== null);
  return (
    <Section id="parent-progress" title="Are they improving?" meta="Last 2 weeks vs the 6 before" className="flex-[1_1_380px]">
      <ChangeLine
        label="Average Learn score"
        change={learn.change}
        unit="out of 10"
        betterWhen="up"
        empty={learn.recentCount + learn.earlierCount === 0 ? 'No marked answers yet.' : 'Not enough marked answers yet to show a trend (needs 3 in each period).'}
      />
      {anyScores && (
        <figure className="flex flex-col gap-2">
          <ol className="grid h-[120px] grid-cols-8 items-end gap-2 border-b border-hairline-strong" aria-label="Average Learn score by week, oldest to newest">
            {learn.weeks.map(w => {
              const label = `Week of ${fmtShort(`${w.startKey}T12:00:00`)}: ${w.avg === null ? 'no marked answers' : `${w.avg}/10 from ${w.count} answer${w.count === 1 ? '' : 's'}`}`;
              return (
                <li key={w.startKey} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={label} aria-label={label}>
                  {w.avg !== null && <span className="font-numeral text-caption text-ink-muted">{w.avg.toFixed(1)}</span>}
                  <span
                    className="w-full max-w-[28px] rounded-t-[4px]"
                    style={{ height: w.avg === null ? 0 : Math.max(4, (w.avg / 10) * BAR_MAX), background: 'var(--progress)' }}
                  />
                </li>
              );
            })}
          </ol>
          <figcaption className="flex justify-between text-caption text-ink-subtle">
            <span>{fmtShort(`${learn.weeks[0].startKey}T12:00:00`)}</span>
            <span>This week</span>
          </figcaption>
        </figure>
      )}
      <div className="flex flex-col gap-3 border-t border-hairline pt-4">
        <div className="flex items-center gap-2 text-[13px] text-ink-subtle">
          <Mic size={14} aria-hidden="true" /> How fluently they speak (rough measure from their recordings)
        </div>
        <ChangeLine label="Speaking pace" change={fluency.pace} unit="words a minute" betterWhen="up" decimals={0} empty="Not enough spoken answers yet to show a trend." />
        <ChangeLine label="Long pauses (over 2 seconds) per answer" change={fluency.longPauses} unit="pauses" betterWhen="down" empty="Not enough spoken answers yet to show a trend." />
      </div>
    </Section>
  );
}

const CONDITION_LABEL: Record<ExamCondition, string> = {
  sim: 'Exam conditions',
  practice: 'Coached practice',
  unknown: 'Sample exam',
};

function ExamCard({ report }: { report: ParentReport }) {
  const { exam } = report;
  const latest = exam.latest;
  return (
    <Section id="parent-exam" title="Sample speaking exam" meta={`Marked out of ${EXAM_TOTAL_MAX}`} className="flex-[1_1_320px]">
      {latest === null ? (
        <p className="text-body-s text-ink-muted">
          {report.learnerName} hasn’t taken a full sample exam yet. It copies the Cambridge IGCSE French (0520) speaking exam:
          a role play and two topic conversations, marked out of {EXAM_TOTAL_MAX}. One is available every 7 days.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-baseline gap-1">
              <span className="font-numeral text-num-xl text-ink" data-testid="parent-exam-latest">{latest.total}</span>
              <span className="font-numeral text-[18px] text-ink-subtle">/{EXAM_TOTAL_MAX}</span>
            </span>
            <span className="text-[13px] text-ink-subtle">Latest · {fmtDay(latest.at)} · {CONDITION_LABEL[latest.condition]}</span>
          </div>
          {exam.areas.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="Marks by area">
              {exam.areas.map(a => (
                <li key={a.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body-s text-ink">
                      {a.label}
                      {exam.weakestArea?.key === a.key && exam.areas.length > 1 && <span className="ml-2 text-[13px] text-correction-text">Weakest area</span>}
                    </span>
                    <span className="font-numeral text-[14px] text-ink-muted">{a.mark}/{a.max}</span>
                  </div>
                  <span className="block h-2 overflow-hidden rounded-pill bg-track">
                    <span className="block h-full rounded-pill" style={{ width: `${(a.mark / a.max) * 100}%`, background: 'var(--progress)' }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {exam.attempts.length > 1 && (
            <table className="w-full text-left text-body-s">
              <caption className="sr-only">Recent sample exams</caption>
              <thead>
                <tr className="text-[13px] text-ink-subtle">
                  <th className="pb-1 font-normal">Date</th>
                  <th className="pb-1 font-normal">Type</th>
                  <th className="pb-1 text-right font-normal">Mark</th>
                </tr>
              </thead>
              <tbody>
                {exam.attempts.slice(0, 5).map(a => (
                  <tr key={a.at} className="border-t border-hairline">
                    <td className="py-1.5 text-ink">{fmtShort(a.at)}</td>
                    <td className="py-1.5 text-ink-muted">{CONDITION_LABEL[a.condition]}</td>
                    <td className="py-1.5 text-right font-numeral text-ink">{a.total}/{EXAM_TOTAL_MAX}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      <p className="text-caption text-ink-subtle [text-wrap:pretty]">
        Marks are the app’s own estimate, not an official Cambridge grade, and the app’s marking hasn’t yet been checked against real
        examiners. Grade boundaries change every exam series, so use the trend rather than one number. “Coached practice” attempts give live help and are easier.
      </p>
    </Section>
  );
}

function TopicsCard({ report }: { report: ParentReport }) {
  const { practised, strongest, needsWork, notTried } = report.topics;
  return (
    <Section id="parent-topics" title="Topics" meta="Last 4 months">
      {practised.length === 0 ? (
        <p className="text-body-s text-ink-muted">No topics practised yet.</p>
      ) : (
        <>
          {(strongest || needsWork) && (
            <div className="flex flex-wrap gap-3">
              {strongest && <TopicHighlight label="Strongest" topic={strongest.label} avg={strongest.avg} />}
              {needsWork && <TopicHighlight label="Needs the most work" topic={needsWork.label} avg={needsWork.avg} />}
            </div>
          )}
          <table className="w-full text-left text-body-s">
            <caption className="sr-only">Topics practised</caption>
            <thead>
              <tr className="text-[13px] text-ink-subtle">
                <th className="pb-1 font-normal">Topic</th>
                <th className="pb-1 text-right font-normal">Sessions</th>
                <th className="pb-1 text-right font-normal">Average</th>
                <th className="hidden pb-1 text-right font-normal sm:table-cell">Last</th>
              </tr>
            </thead>
            <tbody>
              {practised.slice(0, 8).map(t => (
                <tr key={t.key} className="border-t border-hairline">
                  <td className="py-1.5 text-ink">{t.label}</td>
                  <td className="py-1.5 text-right font-numeral text-ink-muted">{t.sessions}</td>
                  <td className="py-1.5 text-right font-numeral text-ink">{t.avg === null ? '—' : `${t.avg.toFixed(1)}/10`}</td>
                  <td className="hidden py-1.5 text-right text-ink-subtle sm:table-cell">{fmtShort(t.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {notTried.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-ink-subtle">Common exam topics not tried yet</span>
          <div className="flex flex-wrap gap-2">
            {notTried.map(t => (
              <span key={t.key} className="rounded-pill border border-hairline px-3 py-1 text-[13px] text-ink-muted">{t.label}</span>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function TopicHighlight({ label, topic, avg }: { label: string; topic: string; avg: number | null }) {
  return (
    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5 rounded-control border border-hairline bg-surface-recessed p-4">
      <span className="text-[13px] text-ink-subtle">{label}</span>
      <span className="text-subtitle text-ink">{topic}</span>
      {avg !== null && <span className="font-numeral text-[13px] text-ink-muted">Average {avg.toFixed(1)}/10</span>}
    </div>
  );
}

function CoachNotes({ report }: { report: ParentReport }) {
  const { nextSteps } = report.coachNotes;
  if (nextSteps.length === 0) return null;
  return (
    <Section id="parent-coach" title="What their coach is working on" meta={`Notes written to ${report.learnerName}`}>
      <ul className="flex flex-col gap-3">
        {nextSteps.map(n => (
          <li key={n} className="flex gap-3">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-reward-text" aria-hidden="true" />
            <p className="text-body-s text-ink-muted [text-wrap:pretty]">{n}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function AboutCard({ name }: { name: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-hairline bg-surface-recessed p-5 text-body-s text-ink-muted">
      <p className="flex items-center gap-2 text-label text-ink"><Lock size={14} aria-hidden="true" /> About this page</p>
      <p className="[text-wrap:pretty]">
        This page shows how often {name} practises and how it is going: no recordings and no transcripts of what they said. Only {name} can
        turn this link off, from Profile → Parent view, and they can see when it was last opened.
      </p>
      <p className="flex items-center gap-2 text-ink-subtle"><MessageCircle size={14} aria-hidden="true" /> Bookmark this page to check back each week.</p>
    </section>
  );
}
