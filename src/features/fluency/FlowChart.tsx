import type { SeriesPoint } from '../../domain/fluency/fluencyProfile';
import { CHART_EMPTY, CHART_TITLE, MEASURE_DISPLAY, formatMeasure } from './fluencyCopy';

/**
 * Speech rate per spoken answer (fluency-trainer §2.3): one series, so no
 * legend box. The title names it. Thin columns with 4 px rounded tops sit on
 * a shared baseline with a 2 px gap. Colour is a role token only. Each column
 * has a native tooltip and the same numbers are in a screen-reader table. The
 * newest column is the only direct label. Answers with no words heard are
 * left out, never drawn as zero.
 */

const HEIGHT = 120;
const GAP = 2;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
}

export function FlowChart({ series }: { series: SeriesPoint[] }) {
  const points = series.filter((p): p is SeriesPoint & { wordsPerMinute: number } => p.wordsPerMinute !== null);
  if (points.length === 0) {
    return <p className="text-body-s text-ink-muted" data-testid="flow-chart-empty">{CHART_EMPTY}</p>;
  }
  const max = Math.max(...points.map((p) => p.wordsPerMinute), 1);
  const slot = 100 / points.length;
  const latest = points[points.length - 1];
  const unit = MEASURE_DISPLAY.wordsPerMinute.unit;

  return (
    <figure className="flex flex-col gap-2" data-testid="flow-chart">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-label font-semibold text-ink">{CHART_TITLE}</span>
        <span className="text-caption text-ink-muted">
          Latest: <span className="font-numeral text-ink">{formatMeasure('wordsPerMinute', latest.wordsPerMinute)}</span> {unit}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[120px] w-full"
        role="img"
        aria-label={`${CHART_TITLE}: ${points.length} answers, latest ${formatMeasure('wordsPerMinute', latest.wordsPerMinute)} ${unit}`}
      >
        <line x1="0" x2="100" y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} stroke="var(--hairline-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => {
          const h = Math.max(2, (p.wordsPerMinute / max) * (HEIGHT - 8));
          const isLatest = i === points.length - 1;
          return (
            <g key={`${p.at}-${i}`}>
              <title>{`${shortDate(p.at)}: ${formatMeasure('wordsPerMinute', p.wordsPerMinute)} ${unit}`}</title>
              {/* A wider invisible hit target than the column itself. */}
              <rect x={i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
              <rect
                x={i * slot + GAP / 2}
                y={HEIGHT - h}
                width={Math.max(0.5, slot - GAP)}
                height={h}
                rx={Math.min(1.5, (slot - GAP) / 2)}
                fill={isLatest ? 'var(--action)' : 'var(--action-soft)'}
                stroke={isLatest ? 'none' : 'var(--action)'}
                strokeWidth={isLatest ? 0 : 1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-caption text-ink-subtle" aria-hidden="true">
        <span>{shortDate(points[0].at)}</span>
        <span>{shortDate(latest.at)}</span>
      </div>
      <table className="sr-only">
        <caption>{CHART_TITLE}</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">{`${MEASURE_DISPLAY.wordsPerMinute.label} (${unit})`}</th><th scope="col">Pauses a minute</th></tr></thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={`${p.at}-${i}`}>
              <td>{shortDate(p.at)}</td>
              <td>{formatMeasure('wordsPerMinute', p.wordsPerMinute)}</td>
              <td>{formatMeasure('pausesPerMinute', p.pausesPerMinute)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
