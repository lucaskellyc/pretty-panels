import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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
  /** The width the rows refuse to fall below. Narrower than this the table
   *  stops shrinking and scrolls sideways inside its plate instead, so a row
   *  stays a whole capsule and you scroll to the rest of it rather than
   *  watching every column collapse to an ellipsis at once.
   *
   *  Defaults to a floor built from `columns`: every `width` you declared, plus
   *  `--pp-table-col-min` (112px) for each column that left it off. Pass a CSS
   *  length for your own — `'0'` squeezes instead of scrolling, and a set with
   *  percentage widths wants a length here, since a percentage in the floor
   *  measures against the very plate the floor is compared to. */
  minWidth?: string;
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

/** The cell that paints a row's capsule, pinned to the scrollport so the ground
 *  stays a whole capsule however far the cells have scrolled across it. It
 *  leads every row, takes no width, and holds nothing to announce. */
const GROUND = <td className="pp-table-ground" aria-hidden="true" />;

/** The floor a set of columns implies: the widths that were declared, plus one
 *  `--pp-table-col-min` for each column that was left open. Undefined when
 *  there is nothing to add up, which leaves the table free to shrink. */
const floorWidth = (columns: TableColumn[]): string | undefined => {
  const sized = columns.map((col) => col.width).filter((w): w is string => w != null);
  const open = columns.length - sized.length;
  const terms = open > 0 ? [...sized, `${open} * var(--pp-table-col-min)`] : sized;
  return terms.length > 0 ? `calc(${terms.join(' + ')})` : undefined;
};

/**
 * Whether the scroller has less room than the table inside it wants.
 *
 * A box that scrolls has to be reachable from the keyboard, or its far columns
 * are readable with a pointer and no other way — but a table that fits wants no
 * tab stop of its own, so this is measured rather than assumed. Nothing about
 * the answer changes the layout that produced it (a `tabindex` occupies no
 * space), so unlike the titlebar's version it cannot chatter over a pixel, and
 * a plain comparison is enough.
 */
function useScrollable(
  scroller: RefObject<HTMLDivElement | null>,
  table: RefObject<HTMLTableElement | null>,
) {
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;
    /* Rounding puts these a fraction apart at some zoom levels on a table that
       fits exactly; a pixel of slack keeps that from reading as overflow. */
    const measure = () => setScrollable(box.scrollWidth - box.clientWidth > 1);

    measure();
    /* Both boxes: the room can shrink under a table holding its floor, and the
       floor can change under a room that never moved. */
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    if (table.current) ro.observe(table.current);
    return () => ro.disconnect();
  }, [scroller, table]);

  return scrollable;
}

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
 * Too narrow a plate and the rows **scroll sideways as a set** rather than
 * every column squeezing at once: the table holds a floor built from `columns`
 * (or whatever `minWidth` says) and the overflow lands in a scroller of its
 * own. The row is still a whole capsule at every scroll position — its ground
 * is pinned to the scrollport and as wide as it, so the cut the scrollport
 * makes falls on the text rather than on the shape. The scroller takes a tab
 * stop for as long as it is actually scrolling.
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
  minWidth,
  label,
  className,
}: TableProps) {
  /* A numeric column ends-aligns unless told otherwise — the one case where a
     column's type decides its alignment rather than the caller. */
  const alignOf = (col: TableColumn) => col.align ?? (col.numeric ? 'end' : 'start');

  const cellClass = (col: TableColumn) =>
    cx('pp-table-cell', col.numeric && 'is-numeric', alignOf(col) === 'end' && 'is-end');

  const scroller = useRef<HTMLDivElement>(null);
  const tableEl = useRef<HTMLTableElement>(null);
  const scrollable = useScrollable(scroller, tableEl);

  /* The floor rides on a custom property for the reason `Panel`'s width does:
     an inline `min-width` is a declaration no stylesheet could beat. */
  const style = { '--pp-table-min-w': minWidth ?? floorWidth(columns) } as CSSProperties;

  return (
    <div
      ref={scroller}
      className="pp-table-scroll"
      style={style}
      /* Only while it is genuinely scrolling: a table that fits would otherwise
         put a stop in the tab order that goes nowhere. Named as a region so
         what has just taken focus is announced — but only when there is a
         `label` to name it with, an unnamed region being worse than none. */
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable && label != null ? 'region' : undefined}
      aria-label={scrollable && label != null ? label : undefined}
    >
      <table ref={tableEl} className={cx('pp-table', className)} aria-label={label}>
        {/* Widths ride on <col> rather than on every cell: one declaration per
            column instead of one per cell, and the browser sizes the columns
            before it has laid a single row out. */}
        <colgroup>
          {/* The ground's column. Zero-width, so the capsule it carries is paid
              for out of no column's share. */}
          <col style={{ width: 0 }} />
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {GROUND}
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
              {GROUND}
              <td className="pp-table-cell" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={cx('pp-table-row', row.disabled && 'is-disabled')}>
                {GROUND}
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
    </div>
  );
}
