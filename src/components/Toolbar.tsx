import type { CSSProperties, ReactNode } from 'react';
import { cx } from './util';

export interface ToolbarProps {
  /** The bar's contents, laid out from the leading edge — `Platter`s, buttons,
   *  a `Select`, whatever the job needs. */
  children: ReactNode;
  /** Content pinned to the trailing edge, with the slack between: the status a
   *  bar reports rather than the controls it offers, usually `Readout`s. */
  end?: ReactNode;
  /** Lay the bar out as a row (default) or a column — a strip across the top of
   *  a view, or a tool palette down its side. */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible name. With one the bar becomes a labelled `group`; without, it
   *  is chrome, and the things inside it carry their own semantics. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A bar surface — the plate a row of controls sits on, the way `Panel` is the
 * plate a column of them sits on. Fill it with `Platter`s and `Readout`s.
 *
 * It is a **plate, not a header bar**, and that is a deliberate choice about
 * grounds rather than a shade picked by eye. Everything this is built to hold is
 * drawn for a plate: a `Readout` rests one step *below* the plate and a
 * `Platter` two, so on a `--ctl-bar` ground they would sit shallower than their
 * own container and pop out of it. On `--ctl-panel` they recess exactly as they
 * do inside a `Panel`, which means anything that looks right in a panel body
 * looks right here with no adjustment.
 *
 * It fills the width it is given, so `end` has an edge to pin to. Hand it a
 * width of your own if it should hug its contents instead — that is layout, and
 * layout is yours.
 *
 * It renders no controls of its own. A `Toolbar` with nothing in it is an empty
 * plate, which is the point: the parts are the components you put on it.
 */
export function Toolbar({
  children,
  end,
  orientation = 'horizontal',
  label,
  className,
  style,
}: ToolbarProps) {
  return (
    <div
      className={cx('pp-toolbar', orientation === 'vertical' && 'is-vertical', className)}
      style={style}
      /* Unlabelled, it claims nothing: a `Platter` inside already announces
         itself as a toolbar or a radiogroup, and wrapping those in a second
         unnamed landmark only adds a level to walk through. */
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-orientation={label ? orientation : undefined}
    >
      {children}
      {end != null && <div className="pp-toolbar-end">{end}</div>}
    </div>
  );
}
