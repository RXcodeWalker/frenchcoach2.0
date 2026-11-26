import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { FlowChange } from '../../domain/fluency/flowMeasures';
import { MEASURE_DISPLAY, formatMeasure } from './fluencyCopy';

/**
 * Before → after for each flow measure, with the direction in words and an
 * icon, never colour alone. "Smoother" uses the progress colour. "About the
 * same" and "less smooth" stay neutral ink: a slower take is information, not
 * a correction.
 */
export function ChangeList({ changes, testId }: { changes: FlowChange[]; testId?: string }) {
  return (
    <ul className="flex flex-col divide-y divide-hairline" data-testid={testId}>
      {changes.map((c) => {
        const d = MEASURE_DISPLAY[c.measure];
        const Icon = c.direction === 'same' ? Minus : (c.after > c.before ? ArrowUpRight : ArrowDownRight);
        const tone = c.direction === 'smoother' ? 'text-progress-text' : 'text-ink-muted';
        return (
          <li key={c.measure} className="flex items-center gap-3 py-2.5" data-testid={`change-${c.measure}`} data-direction={c.direction}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-semibold text-ink">{d.label}</span>
              <span className="text-caption text-ink-muted">
                <span className="font-numeral">{formatMeasure(c.measure, c.before)}</span>
                {' → '}
                <span className="font-numeral text-ink">{formatMeasure(c.measure, c.after)}</span> {d.unit}
              </span>
            </span>
            <span className={`inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold ${tone}`}>
              <Icon size={14} aria-hidden="true" />
              {d.change[c.direction]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
