import { Check, Flame } from 'lucide-react';
import type { NewsDay } from './newsProgress';

interface Props {
  days: readonly NewsDay[];
  today: string;
  streak: number;
}

function weekday(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'narrow' });
}

/** The last seven editions as dots, today ringed, plus the edition streak (daily-news §6). */
export function WeekStrip({ days, today, streak }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ol className="flex items-center gap-1.5" aria-label="Your last seven editions">
        {days.map(d => {
          const isToday = d.day === today;
          return (
            <li key={d.day} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-pill text-caption
                  ${d.done ? 'bg-progress-soft text-progress-text' : 'bg-track text-ink-subtle'}
                  ${isToday ? 'ring-2 ring-action ring-offset-2 ring-offset-surface' : ''}`}
                title={d.edition.levels.b1.headline}
              >
                {d.done ? <Check size={12} aria-hidden="true" /> : <span aria-hidden="true">{d.edition.emoji}</span>}
                <span className="sr-only">{d.day}{d.done ? ', done' : ', not done'}{isToday ? ' (today)' : ''}</span>
              </span>
              <span className="text-caption text-ink-subtle" aria-hidden="true">{weekday(d.day)}</span>
            </li>
          );
        })}
      </ol>
      <p className="inline-flex items-center gap-1.5 text-label text-ink" data-testid="news-streak">
        <Flame size={16} className={streak > 0 ? 'text-streak' : 'text-ink-subtle'} aria-hidden="true" />
        {streak > 0 ? (
          <><span className="font-numeral">{streak}</span>-day news streak</>
        ) : (
          'Start a news streak today'
        )}
      </p>
    </div>
  );
}
