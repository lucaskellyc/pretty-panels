import type { ReactNode } from 'react';

export interface IconButtonProps {
  /** The icon to render (e.g. an inline `<svg>`). */
  children: ReactNode;
  onClick?: () => void;
  /** Renders the accent (pressed) state and sets `aria-pressed`. */
  active?: boolean;
  /** Accessible name + tooltip. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A round icon button on a panel-plate ground — the decoupled generalization of
 * the editor's pause / record buttons. Supply your own icon; `active` toggles
 * the accent state.
 */
export function IconButton({
  children,
  onClick,
  active,
  label,
  disabled,
  className,
}: IconButtonProps) {
  const cls = ['pp-round-btn', active ? 'is-active' : '', className ?? '']
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
      {children}
    </button>
  );
}
