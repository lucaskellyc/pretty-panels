import { type AriaAttributes, type ReactNode, forwardRef } from 'react';
import { cx } from './util';

interface IconButtonBaseProps {
  /** The icon to render (e.g. an inline `<svg>`). */
  children: ReactNode;
  /** Accessible name + tooltip. */
  label?: string;
  disabled?: boolean;
  /** Says this button opens a floating surface: `"menu"` for a `Menu`,
   *  `"dialog"` for a `Popover` holding a form. The trigger's half of that
   *  contract — the surface can't set it, because it never sees the control that
   *  opened it. */
  'aria-haspopup'?: AriaAttributes['aria-haspopup'];
  /** Whether the surface this button opens is currently up. Pair it with
   *  `aria-haspopup`; without it a screen reader announces a plain button and
   *  never says the menu is open. */
  'aria-expanded'?: AriaAttributes['aria-expanded'];
  className?: string;
}

export interface IconButtonStandardProps extends IconButtonBaseProps {
  /** A plain action — press it and something happens. It has no state, so
   *  nothing is announced as pressed. */
  mode?: 'standard';
  onClick?: () => void;
  /** Paint the accent: the primary action of a cluster. It says "this is the
   *  one to press", not "this is on" — use `mode="toggle"` for that. */
  active?: boolean;
  onChange?: never;
}

export interface IconButtonToggleProps extends IconButtonBaseProps {
  /** A two-state control — press it and it stays on. Paints the accent while on
   *  and reports itself to assistive tech as a pressed toggle button. */
  mode: 'toggle';
  /** Whether the toggle is on (fully controlled). */
  active: boolean;
  /** Called with the state the press asks for — the opposite of `active`. */
  onChange: (active: boolean) => void;
  onClick?: never;
}

/** `toggle` brings `active` / `onChange` with it and refuses `onClick`, so the
 *  mode a button is in decides which props it will even accept. */
export type IconButtonProps = IconButtonStandardProps | IconButtonToggleProps;

/**
 * A round icon button on a panel-plate ground — the decoupled generalization of
 * the editor's pause / record buttons. Supply your own icon.
 *
 * Two modes, because an accented button means two different things and only one
 * of them is a state:
 *
 * - **`standard`** (the default) — an action. `active` paints the accent to mark
 *   the primary one in a cluster, and that is all it does.
 * - **`toggle`** — an on/off control. `active` is the state, `onChange` reports
 *   the press, and the button carries `aria-pressed` so it is announced as a
 *   toggle rather than as a button that happens to be highlighted.
 *
 * Only the semantics differ; the accent is the kit's "on" paint either way.
 *
 * It forwards a ref to the `<button>`, which is what a `Menu` or `Popover`
 * anchors to when this is the control that opens one.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  props,
  ref,
) {
  const { children, label, disabled, className } = props;
  // Narrowed into a `const` so the toggle branch stays narrowed inside the
  // handler closure below.
  const toggle = props.mode === 'toggle' ? props : undefined;

  return (
    <button
      ref={ref}
      type="button"
      className={cx('pp-round-btn', props.active && 'is-active', className)}
      onClick={toggle ? () => toggle.onChange(!toggle.active) : props.onClick}
      disabled={disabled}
      /* An action gets no `aria-pressed` at all: the attribute is what makes a
         button a toggle to a screen reader, and a primary action is not one. */
      aria-pressed={toggle ? toggle.active : undefined}
      aria-label={label}
      title={label}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
    >
      {children}
    </button>
  );
});
