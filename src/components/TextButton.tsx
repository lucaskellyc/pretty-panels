import type { ReactNode } from 'react';
import { cx } from './util';

interface TextButtonBaseProps {
  /** The button label. */
  children: ReactNode;
  /** Optional leading icon (e.g. an inline `<svg>`), placed before the label. */
  icon?: ReactNode;
  /** Tooltip + accessible-name override. Defaults to the visible label. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export interface TextButtonStandardProps extends TextButtonBaseProps {
  /** A plain action — press it and something happens. It has no state, so
   *  nothing is announced as pressed. */
  mode?: 'standard';
  onClick?: () => void;
  /** Paint the accent: the primary action of a cluster — the `Apply` beside a
   *  `Cancel`. It says "this is the one to press", not "this is on"; use
   *  `mode="toggle"` for that. */
  active?: boolean;
  onChange?: never;
}

export interface TextButtonToggleProps extends TextButtonBaseProps {
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
export type TextButtonProps = TextButtonStandardProps | TextButtonToggleProps;

/**
 * A capsule text button on a panel-plate ground — the text-label sibling of
 * `IconButton`. It hugs its label, with an optional leading icon.
 *
 * It takes the same two modes, for the same reason: `standard` (the default) is
 * an action whose `active` marks it as the primary one, and `toggle` is an on/off
 * control whose `active` is a state, reported through `onChange` and announced
 * with `aria-pressed`. See `IconButton` for the full reasoning.
 */
export function TextButton(props: TextButtonProps) {
  const { children, icon, label, disabled, className } = props;
  // Narrowed into a `const` so the toggle branch stays narrowed inside the
  // handler closure below.
  const toggle = props.mode === 'toggle' ? props : undefined;

  return (
    <button
      type="button"
      className={cx('pp-text-btn', props.active && 'is-active', className)}
      onClick={toggle ? () => toggle.onChange(!toggle.active) : props.onClick}
      disabled={disabled}
      /* An action gets no `aria-pressed` at all — see `IconButton`. */
      aria-pressed={toggle ? toggle.active : undefined}
      aria-label={label}
      title={label}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
