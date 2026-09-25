import type { ReactNode } from 'react';
import { CHEVRON } from './ListRow';
import { cx } from './util';

/** One column. `key` is what a row is read by, and what `sort` names. */
export interface TableColumn {
  /** Reads the field of the same name off every row, and identifies the column
   *  to `sort` / `onSortChange`. */
  key: string;
  /** Column heading. Defaults to `key`. */
  header?: ReactNode;
  /** Set this column in the mono face with tabular figures — the treatment
   *  `Readout` and a row's trailing `meta` already share, so a column of
   *  changing digits stays on its decimal point. Also flips the default
   *  alignment to the end, where a number belongs. */
  numeric?: boolean;
  /** Override the alignment a `numeric` column would otherwise pick. */
  align?: 'start' | 'end';
  /** A CSS width for the column, applied through a `<col>`. The table lays out
   *  fixed, so this is honoured exactly and the columns that leave it off split
   *  what is left over evenly. Size the predictable ones — a count, a status —
   *  and let the open-ended column take the slack. */
  width?: string;
  /** Let the heading be pressed to sort by this column. Pair with `sort` and
   *  `onSortChange` — nothing sorts on its own. */
  sortable?: boolean;
}

/** A row. Every field beyond `id` and `disabled` is a cell, looked up by the
 *  column's `key` — so a cell is any `ReactNode`, and a custom one is just an
 *  element in the field rather than a render prop. */
export interface TableRow {
  /** Identifies the row. This is the React key, and what a caller matches on. */
  id: string;
  /** Dim the row. It stays in the table and keeps its place. */
  disabled?: boolean;
  [column: string]: ReactNode;
}

/** Which column the table is sorted by, and which way. */
export interface TableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TableProps {
  /** The columns, left to right. */
  columns: TableColumn[];
  /** The rows, top to bottom — already in the order they should appear. */
  rows: TableRow[];
  /** The sort to *show*: it paints the arrow on that column's heading. It does
   *  not order `rows`. */
  sort?: TableSort | null;
  /** Called with the sort a heading press asks for — the same column flips
   *  direction, a new one starts ascending. Applying it to `rows` is yours,
   *  like every other control here. */
  onSortChange?: (sort: TableSort) => void;
  /** Shown in place of the body when there are no rows. Without it an empty
   *  table is just its headings, which reads as broken rather than as empty. */
  empty?: ReactNode;
  /** Accessible name for the table. */
  label?: string;
  className?: string;
}

/** The sort a press on `key` asks for: the sorted column flips, any other
 *  column starts ascending. */
const nextSort = (key: string, sort: TableSort | null | undefined): TableSort =>
  sort?.key === key && sort.direction === 'asc'
    ? { key, direction: 'desc' }
    : { key, direction: 'asc' };

/**
 * `.pp-table` — `List`'s capsule rows arranged by column.
 *
 * The third of the structure parts: `List` orders rows by sequence, `Tree` by
 * depth, and this one by field. A row is a plain record — every key beyond `id`
 * and `disabled` is a cell — so a table is its `columns` and its `rows` and
 * nothing else to keep in step.
 *
 * Headings are quiet by default. Mark a column `sortable` and its heading
 * becomes a button that reports the sort it wants through `onSortChange`;
 * **the table never reorders `rows` itself**, exactly as `List` never applies
 * its own `onReorder`. You hold the data, so you hold the sort — which is also
 * what lets a column sort on something other than what it displays.
 *
 * A `numeric` column takes the mono, tabular-figure treatment `Readout` and a
 * row's trailing `meta` already share, so columns of digits line up on the
 * decimal point across the whole set rather than only within this one.
 *
 * It renders a real `<table>`: a screen reader announces the row and column a
 * cell sits in, which a grid of divs cannot do without rebuilding the whole
 * table role by hand.
 */
export function Table({
  columns,
  rows,
  sort,
  onSortChange,
  empty,
  label,
  className,
}: TableProps) {
  /* A numeric column ends-aligns unless told otherwise — the one case where a
     column's type decides its alignment rather than the caller. */
  const alignOf = (col: TableColumn) => col.align ?? (col.numeric ? 'end' : 'start');

  const cellClass = (col: TableColumn) =>
    cx('pp-table-cell', col.numeric && 'is-numeric', alignOf(col) === 'end' && 'is-end');

  return (
    <table className={cx('pp-table', className)} aria-label={label}>
      {/* Widths ride on <col> rather than on every cell: one declaration per
          column instead of one per cell, and the browser sizes the columns
          before it has laid a single row out. */}
      <colgroup>
        {columns.map((col) => (
          <col key={col.key} style={col.width ? { width: col.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((col) => {
            const sorted = sort?.key === col.key ? sort.direction : null;
            return (
              <th
                key={col.key}
                scope="col"
                className={cx(cellClass(col), 'pp-table-head')}
                /* Only a sortable column carries the state — on a fixed column
                   `none` would announce a sort that is not on offer. */
                aria-sort={
                  col.sortable ? (sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none') : undefined
                }
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className={cx('pp-table-sort', sorted && `is-${sorted}`)}
                    onClick={() => onSortChange?.(nextSort(col.key, sort))}
                  >
                    {col.header ?? col.key}
                    {/* The chevron the rest of the set uses, turned to point up
                        or down. It is drawn on every sortable heading and made
                        visible by state, so a heading does not change width the
                        first time it is sorted. */}
                    <span className="pp-table-caret" aria-hidden="true">
                      {CHEVRON}
                    </span>
                  </button>
                ) : (
                  (col.header ?? col.key)
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && empty != null ? (
          <tr className="pp-table-row is-empty">
            <td className="pp-table-cell" colSpan={columns.length}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className={cx('pp-table-row', row.disabled && 'is-disabled')}>
              {columns.map((col) => (
                <td key={col.key} className={cellClass(col)}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
