import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { CalendarCell, PracticeCalendar } from '../../features/myPlan/planModel';
import { dayDate, plural, shortDay } from './formatDay';

/** How much was practised that day — never how well (a calendar coloured by score would be a mark). */
const LEVEL_STYLE: Record<CalendarCell['level'], { background: string; boxShadow: string }> = {
  0: { background: 'var(--surface-recessed)', boxShadow: 'inset 0 0 0 1px var(--hairline)' },
  1: { background: 'var(--progress-soft)', boxShadow: 'inset 0 0 0 1px var(--progress)' },
  2: { background: 'color-mix(in srgb, var(--progress) 45%, var(--surface))', boxShadow: 'none' },
  3: { background: 'var(--progress)', boxShadow: 'none' },
};
const LEVEL_TEXT = ['nothing', '1 session', '2–3 sessions', '4 or more sessions'] as const;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

function cellLabel(c: CalendarCell): string {
  const date = dayDate(c.key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date}: ${c.count === 0 ? 'no practice' : plural(c.count, 'session')}${c.today ? ', today' : ''}`;
}

/**
 * Practice calendar (the old "Fluency Heatmap"): twelve weeks of days, shaded by
 * how many Learn answers, exams and role-play answers were recorded — the
 * amount, never the score. Facts only: days practised, sessions, longest run.
 */
export function PlanCalendar({ calendar, streakDays }: { calendar: PracticeCalendar; streakDays: number }) {
  const first = calendar.weeks[0]?.[0]?.key;
  const lastWeek = calendar.weeks[calendar.weeks.length - 1] ?? [];
  const last = lastWeek.find(c => c.today)?.key ?? lastWeek[lastWeek.length - 1]?.key;
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="plan-calendar"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="plan-calendar"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="plan-calendar" className="text-section text-ink">Your practice</h2>
        {first && last && <span className="text-[13px] text-ink-subtle">{shortDay(first)} – {shortDay(last)}</span>}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-muted" data-testid="plan-calendar-summary">
        <span><span className="font-numeral text-ink">{calendar.daysPractised}</span> {calendar.daysPractised === 1 ? 'day' : 'days'} practised</span>
        <span><span className="font-numeral text-ink">{calendar.sessions}</span> {calendar.sessions === 1 ? 'session' : 'sessions'}</span>
        <span>Longest run <span className="font-numeral text-ink">{plural(calendar.longestRun, 'day')}</span></span>
      </p>

      <div className="flex w-full max-w-[420px] gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] pr-0.5" aria-hidden="true">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="flex h-full items-center text-caption leading-none text-ink-subtle">{w}</span>
          ))}
        </div>
        <ol
          className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, minmax(0, 1fr))` }}
          aria-label="Days practised, oldest first"
        >
          {calendar.weeks.flat().map(c => (
            <li
              key={c.key}
              title={c.future ? undefined : cellLabel(c)}
              aria-label={c.future ? undefined : cellLabel(c)}
              aria-hidden={c.future ? true : undefined}
              className="aspect-square w-full max-w-7 rounded-[4px]"
              style={c.future
                ? { background: 'transparent' }
                : { ...LEVEL_STYLE[c.level], ...(c.today ? { boxShadow: 'inset 0 0 0 1.5px var(--action)' } : {}) }}
            />
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
          <Flame size={14} className="text-streak-text" aria-hidden="true" />
          {streakDays > 0 ? `${streakDays}-day streak` : 'No streak yet — practise today to start one'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-caption text-ink-subtle" aria-label="Shade shows how many sessions that day">
          Less
          {([0, 1, 2, 3] as const).map(l => (
            <span key={l} title={LEVEL_TEXT[l]} className="block h-3 w-3 rounded-[3px]" style={LEVEL_STYLE[l]} aria-hidden="true" />
          ))}
          More
        </span>
      </div>
    </motion.section>
  );
}
