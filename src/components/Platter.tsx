import type { ReactNode } from 'react';

export interface PlatterItem {
  /** Visible text. When present the segment renders as a text button that hugs
   *  its label; a leading `icon` is placed before it. */
  text?: ReactNode;
  /** Leading icon (e.g. an inline `<svg>`). Alone it makes a square icon button. */
  icon?: ReactNode;
  /** Accessible name + tooltip. Required for icon-only segments; falls back to a
   *  string `text`. */
  label?: string;
  onClick?: () => void;
  /** Paints the accent (selected) state and sets `aria-pressed`. */
  active?: boolean;
  disabled?: boolean;
}

export interface PlatterProps {
  /** The segments, left-to-right (or top-to-bottom when vertical). */
  items: PlatterItem[];
  /** Lay the segments in a row (default) or a column. */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible name for the group (the toolbar's `aria-label`). */
  label?: string;
  className?: string;
}

/**
 * A capsule platter — a recessed pill tray holding a row or column of icon and
 * text buttons. Mix `icon`- and `text`-bearing items freely; each segment lights
 * up on hover and paints the accent when `active`. Drop it anywhere: it hugs its
 * contents (`width: fit-content`).
 */
export function Platter({ items, orientation = 'horizontal', label, className }: PlatterProps) {
  const cls = ['pp-platter', orientation === 'vertical' ? 'is-vertical' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
    >
      {items.map((item, i) => {
        const hasText = item.text != null;
        const name = item.label ?? (typeof item.text === 'string' ? item.text : undefined);
        const btnCls = ['pp-platter-btn', hasText ? 'has-text' : '', item.active ? 'is-active' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={i}
            type="button"
            className={btnCls}
            onClick={item.onClick}
            disabled={item.disabled}
            aria-pressed={item.active}
            aria-label={name}
            title={name}
          >
            {item.icon}
            {hasText && <span>{item.text}</span>}
          </button>
        );
      })}
    </div>
  );
}
