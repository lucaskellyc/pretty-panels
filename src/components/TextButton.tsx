import type { ReactNode } from 'react';

export interface TextButtonProps {
  /** The button label. */
  children: ReactNode;
  onClick?: () => void;
  /** Optional leading icon (e.g. an inline `<svg>`), placed before the label. */
  icon?: ReactNode;
  /** Renders the accent (pressed) state and sets `aria-pressed`. */
  active?: boolean;
  /** Tooltip + accessible-name override. Defaults to the visible label. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A capsule text button on a panel-plate ground — the text-label sibling of
 * `IconButton`. It hugs its label (with an optional leading icon); `active`
 * toggles the accent state.
 */
export function TextButton({
  children,
  onClick,
  icon,
  active,
  label,
  disabled,
  className,
}: TextButtonProps) {
  const cls = ['pp-text-btn', active ? 'is-active' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
