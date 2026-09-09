import type { ReactNode } from 'react';

export interface Column<Row> {
  /** Header label — set in eyebrow style. */
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: Row) => ReactNode;
  /** Right-align and set the cell in the mono numeral face. */
  numeric?: boolean;
  /** Column width, e.g. '74px'. */
  width?: string;
}

interface Props<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** When set, the whole row is a link/button with a 2% ink hover and a chevron. */
  onRowClick?: (row: Row) => void;
  className?: string;
}

/**
 * A list/table (Component Kit §12). 44px rows separated by --hairline — no
 * zebra, no card-per-row. The header is --surface-recessed with eyebrow-class
 * labels. Numbers are right-aligned and mono; interactive rows get a 2% ink
 * hover across the whole row plus a chevron, and the whole row is the link.
 */
export function Table<Row>({ columns, rows, rowKey, onRowClick, className = '' }: Props<Row>) {
  const gridCols = columns.map((c) => c.width ?? 'minmax(0,1fr)').join(' ') + (onRowClick ? ' 28px' : '');

  return (
    <div className={`overflow-hidden rounded-card border border-hairline ${className}`}>
      <div
        className="grid items-center gap-3 px-3.5 py-2 surface-recessed
          text-eyebrow uppercase text-ink-subtle"
        style={{ gridTemplateColumns: gridCols }}
      >
        {columns.map((c, i) => (
          <div key={i} className={c.numeric ? 'text-right' : undefined}>
            {c.header}
          </div>
        ))}
        {onRowClick && <div />}
      </div>

      {rows.map((row) => {
        const cells = (
          <>
            {columns.map((c, i) => (
              <div
                key={i}
                className={`${c.numeric ? 'text-right font-numeral tabular-nums text-ink' : 'text-body-s text-ink-muted'}`}
              >
                {c.cell(row)}
              </div>
            ))}
            {onRowClick && (
              <div aria-hidden="true" className="text-right text-ink-subtle">
                ›
              </div>
            )}
          </>
        );

        const shared = 'grid items-center gap-3 px-3.5 min-h-[44px] border-t border-hairline';

        return onRowClick ? (
          <button
            key={rowKey(row)}
            onClick={() => onRowClick(row)}
            style={{ gridTemplateColumns: gridCols }}
            className={`${shared} w-full text-left transition-colors duration-state ease-smooth
              hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]`}
          >
            {cells}
          </button>
        ) : (
          <div
            key={rowKey(row)}
            style={{ gridTemplateColumns: gridCols }}
            className={shared}
          >
            {cells}
          </div>
        );
      })}
    </div>
  );
}
