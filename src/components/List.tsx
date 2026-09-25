import React, { useEffect, useRef, useState } from 'react';
import { GRIP, RowContent, type RowFields, nameOf } from './ListRow';
import { clamp, cx } from './util';

/** A row. `disabled` dims it and takes away its handle, so it can't be picked
 *  up — it still shifts as other rows move around it. */
export interface ListItem extends RowFields {}

export interface ListProps {
  /** The rows, top to bottom. A bare string is shorthand for `{ id: theString }`. */
  items: (string | ListItem)[];
  /** Give every enabled row a drag handle. Pair with `onReorder`. */
  reorderable?: boolean;
  /** Called once on drop (or on an arrow keypress) with the indices to move
   *  between. Applying it to `items` is yours, like every other control here. */
  onReorder?: (from: number, to: number) => void;
  /** Accessible name for the list. */
  label?: string;
  className?: string;
}

/** Normalize the `string | ListItem` shorthand. */
const toItem = (r: string | ListItem): ListItem => (typeof r === 'string' ? { id: r } : r);

/** A drag in flight: where it started, where it would land, and how far the
 *  pointer has travelled since pointerdown. */
interface Drag {
  from: number;
  to: number;
  dy: number;
}

/**
 * `.pp-list` — a stack of capsule rows on the plate, each with an optional
 * leading icon and a trailing mono readout.
 *
 * With `reorderable` every enabled row grows a grip on its left. Dragging one
 * slides its neighbours out of the way and commits a single `onReorder(from,
 * to)` on drop — nothing moves in your data until then. A focused grip also
 * takes ArrowUp / ArrowDown, which moves the row one place and keeps focus on
 * it, so the list is reorderable without a pointer.
 *
 * Rows are a fixed height, so the drag measures one row pitch at pointerdown
 * and every hop is a multiple of it.
 */
export function List({ items, reorderable = false, onReorder, label, className }: ListProps) {
  const rows = items.map(toItem);
  const rowEls = useRef<(HTMLLIElement | null)[]>([]);
  /** Grips by item id, not by index — a keyboard move renumbers the indices out
   *  from under us, and the row we want to keep focused is the one that moved. */
  const grips = useRef(new Map<string, HTMLButtonElement | null>());
  const refocus = useRef<string | null>(null);
  const pitch = useRef(0);
  const startY = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Runs after the parent has re-rendered with the new order, which is the
  // first moment the moved row's grip exists at its new index.
  useEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    grips.current.get(id)?.focus();
  });

  const clampIndex = (i: number) => clamp(i, 0, rows.length - 1);

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const els = rowEls.current;
    if (els.length < 2) return;
    pitch.current = Math.abs((els[1]?.offsetTop ?? 0) - (els[0]?.offsetTop ?? 0));
    if (!pitch.current) return;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i, dy: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    // If the button came up without us seeing the pointerup (e.g. released past
    // the window edge), drop the row where it stands rather than letting it keep
    // tracking the pointer.
    if (e.buttons === 0) {
      endDrag();
      return;
    }
    const dy = e.clientY - startY.current;
    setDrag((d) => (d ? { from: d.from, to: clampIndex(d.from + Math.round(dy / pitch.current)), dy } : d));
  };

  const endDrag = () => {
    if (!drag) return;
    if (drag.to !== drag.from) onReorder?.(drag.from, drag.to);
    setDrag(null);
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    const to = i + dir;
    if (to < 0 || to >= rows.length) return;
    refocus.current = rows[i].id;
    onReorder?.(i, to);
  };

  /** How far row `i` is pushed while a drag is in flight. The dragged row
   *  follows the pointer; everything between its old and new index steps one
   *  pitch the other way to open the gap. */
  const offsetOf = (i: number) => {
    if (!drag) return 0;
    if (i === drag.from) {
      // The carried row stops at the ends of the stack: it can rise by the
      // slots above it and fall by the slots below, and no further. The travel
      // is clamped here rather than in `dy`, which stays the raw pointer delta
      // — so overshooting parks the row on the end instead of banking distance
      // it would have to give back before the row moved again.
      const up = -drag.from * pitch.current;
      const down = (rows.length - 1 - drag.from) * pitch.current;
      return clamp(drag.dy, up, down);
    }
    if (drag.to > drag.from && i > drag.from && i <= drag.to) return -pitch.current;
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return pitch.current;
    return 0;
  };

  return (
    <ul
      className={cx(
        'pp-list',
        reorderable && 'is-reorderable',
        // Scopes the push transition to a live drag. Left on afterwards it would
        // animate each pushed row back from -pitch just as the new order drops
        // it a slot, which reads as a lurch.
        drag && 'is-dragging',
        className,
      )}
      aria-label={label}
    >
      {rows.map((row, i) => {
        const offset = offsetOf(i);
        return (
          <li
            key={row.id}
            ref={(el) => {
              rowEls.current[i] = el;
            }}
            className={cx(
              'pp-list-row',
              row.disabled && 'is-disabled',
              drag?.from === i && 'is-carried',
            )}
            style={offset ? { transform: `translateY(${offset}px)` } : undefined}
          >
            {/* A locked row keeps an inert grip rather than losing it, so its
                label stays on the same rule as every other row's. */}
            {reorderable &&
              (row.disabled ? (
                <span className="pp-list-grip is-locked" aria-hidden="true">
                  {GRIP}
                </span>
              ) : (
                <button
                  ref={(el) => {
                    grips.current.set(row.id, el);
                  }}
                  type="button"
                  className="pp-list-grip"
                  /* The position is part of the name so a screen reader reads it
                     back on focus and after every move. */
                  aria-label={`Move ${nameOf(row)}, ${i + 1} of ${rows.length}`}
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  onPointerDown={onPointerDown(i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={onKeyDown(i)}
                >
                  {GRIP}
                </button>
              ))}
            <RowContent row={row} />
          </li>
        );
      })}
    </ul>
  );
}
