import React, { type ReactNode, useRef } from 'react';

export interface TabItem {
  /** Identifies the tab — this is what `onChange` reports. */
  id: string;
  /** Visible text. Defaults to `id`. */
  label?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** The tabs, left to right. A bare string is shorthand for `{ id: theString }`. */
  items: (string | TabItem)[];
  /** Active tab id (fully controlled). */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the strip (the tablist's `aria-label`). */
  label?: string;
  className?: string;
}

/** Normalize the `string | TabItem` shorthand. */
const toItem = (t: string | TabItem): TabItem => (typeof t === 'string' ? { id: t } : t);

/**
 * The `.tab-bar` strip — capsule tabs on the header ground. Hand it to a Panel's
 * `title` and it becomes the plate's flush header; drop it anywhere else and
 * it's a self-contained bar.
 *
 * It renders only the strip: which body to show is yours to switch on `value`,
 * the same way every other control here leaves the state to you. Keyboard
 * follows the ARIA tabs pattern — one tab stop for the whole strip, then
 * arrows / Home / End to move between them, skipping disabled tabs.
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const tabs = items.map(toItem);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex: the strip is a single tab stop. When `value` matches no
  // item, park the stop on the first enabled tab so the strip stays reachable.
  const active = tabs.findIndex((t) => t.id === value);
  const stop = active >= 0 ? active : tabs.findIndex((t) => !t.disabled);

  /** Select (and focus) the next enabled tab from `from`, wrapping around. */
  const step = (from: number, dir: 1 | -1) => {
    const n = tabs.length;
    for (let i = 1; i <= n; i++) {
      const next = (((from + dir * i) % n) + n) % n;
      if (!tabs[next].disabled) {
        refs.current[next]?.focus();
        onChange(tabs[next].id);
        return;
      }
    }
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowRight':
        step(i, 1);
        break;
      case 'ArrowLeft':
        step(i, -1);
        break;
      case 'Home':
        step(-1, 1);
        break;
      case 'End':
        step(tabs.length, -1);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div
      className={className ? `tab-bar ${className}` : 'tab-bar'}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          className="tab"
          role="tab"
          aria-selected={t.id === value}
          disabled={t.disabled}
          tabIndex={i === stop ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={onKeyDown(i)}
        >
          {t.label ?? t.id}
        </button>
      ))}
    </div>
  );
}
