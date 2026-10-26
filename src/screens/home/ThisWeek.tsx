import { motion } from 'framer-motion';
import { fadeUp, fill } from '../../components/motion/variants';
import { scoreFill, scoreSoft, scoreTone } from '../../domain/scoring';

export interface WeekDay {
  /** Short weekday label, e.g. "Mon". */
  day: string;
  /** That day's average score /10, or null when nothing was scored. */
  avg: number | null;
}

interface Props {
  /** Seven days, oldest first; the last is today. */
  days: WeekDay[];
  compact?: boolean;
}

function weekAverage(days: WeekDay[]): string {
  const scored = days.map(d => d.avg).filter((v): v is number => v !== null);
  return scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : '—';
}

/**
 * This week (Home 2a): each day's average score. Desktop draws bars coloured
 * by score (≥8 progress, ≥6 reward, otherwise correction) that grow from 0;
 * compact shows a strip of score cells. Today is marked in the action colour.
 */
export function ThisWeek({ days, compact = false }: Props) {
  const empty = days.every(d => d.avg === null);
  const last = days.length - 1;

  const dayLabel = (d: WeekDay, i: number) => (
    <span className={`block text-center text-caption ${i === last ? 'font-semibold text-action-text' : 'text-ink-subtle'}`}>{d.day}</span>
  );

  if (compact) {
    return (
      <motion.section variants={fadeUp} className="flex flex-col gap-3 rounded-card border border-hairline bg-surface px-5 py-4" data-testid="home-week">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold text-ink">This week</h2>
          <span className="font-numeral text-[13px] text-ink-subtle">avg {weekAverage(days)}</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex min-w-0 flex-col items-center gap-1.5">
              {dayLabel(d, i)}
              <span
                className="flex h-11 w-full items-center justify-center rounded-control font-numeral text-[13px]"
                style={{
                  background: d.avg !== null ? scoreSoft(d.avg) : 'var(--surface-recessed)',
                  color: d.avg !== null ? scoreTone(d.avg) : 'var(--ink-subtle)',
                  boxShadow: i === last ? 'inset 0 0 0 1.5px var(--action)' : 'inset 0 0 0 1px var(--hairline)',
                }}
              >
                {d.avg !== null ? d.avg.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
        {empty && (
          <p className="text-[13px] text-ink-muted">No sessions yet this week. Each day’s average lands in its box after you practise.</p>
        )}
      </motion.section>
    );
  }

  return (
    <motion.section variants={fadeUp} className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6" data-testid="home-week">
      <div className="flex items-baseline justify-between">
        <h2 className="text-section text-ink">This week</h2>
        <span className="font-numeral text-[13px] text-ink-subtle">avg {weekAverage(days)}</span>
      </div>
      <div className="relative grid h-[140px] grid-cols-7 gap-3">
        {days.map((d, i) => (
          <span key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
            {d.avg !== null ? (
              <>
                <span className="font-numeral text-caption text-ink-muted">{d.avg.toFixed(1)}</span>
                <motion.span
                  className="block w-full max-w-10 rounded-control"
                  style={{ background: scoreFill(d.avg) }}
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(8, (d.avg / 10) * 104) }}
                  transition={fill(0.26 + i * 0.06)}
                />
              </>
            ) : (
              <span
                className="block w-full"
                style={{ borderBottom: i === last ? '2px solid var(--action)' : '2px dashed var(--track)' }}
              />
            )}
          </span>
        ))}
        {empty && (
          <span className="absolute inset-x-0 bottom-4 top-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-[14px] font-semibold text-ink">No sessions yet this week</span>
            <span className="max-w-[280px] text-[13px] leading-[1.45] text-ink-muted">Each day’s average score will plot here after you practise.</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-3">{days.map((d, i) => <span key={i}>{dayLabel(d, i)}</span>)}</div>
    </motion.section>
  );
}
