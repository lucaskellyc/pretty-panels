import { type ReactNode, useId } from 'react';
import { cx } from './util';

export interface PlatterItem {
  /** Visible text. When present the segment renders as a text button that hugs
   *  its label; a leading `icon` is placed before it. */
  text?: ReactNode;
  /** Leading icon (e.g. an inline `<svg>`). Alone it makes a square icon button. */
  icon?: ReactNode;
  /** Accessible name + tooltip. Required for icon-only segments; falls back to a
   *  string `text`. */
  label?: string;
  /** Identifies the segment in a `select` platter — this is what `onChange`
   *  reports. Falls back to `label`, then to a string `text`. Unused in the
   *  default `standard` mode. */
  value?: string;
  /** `standard` mode only. A select platter reports through the group's
   *  `onChange` instead, so the segments need no handler of their own. */
  onClick?: () => void;
  /** `standard` mode only — paints the accent and sets `aria-pressed`. Which
   *  segment is lit in a select platter is settled by the group's `value`. */
  active?: boolean;
  disabled?: boolean;
}

interface PlatterBaseProps {
  /** The segments, left-to-right (or top-to-bottom when vertical). */
  items: PlatterItem[];
  /** Lay the segments in a row (default) or a column. */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible name for the group. */
  label?: string;
  className?: string;
}

export interface PlatterStandardProps extends PlatterBaseProps {
  /** Independent buttons — press one and nothing happens to the others. Each
   *  segment carries its own `onClick`, and any number of them may be `active`. */
  mode?: 'standard';
  value?: never;
  onChange?: never;
  name?: never;
}

export interface PlatterSelectProps extends PlatterBaseProps {
  /** A single choice across the whole tray, the way a radio group is one
   *  choice: exactly one segment is selected, and picking another releases it. */
  mode: 'select';
  /** The selected segment's `value` (fully controlled). */
  value: string;
  /** Called with the newly selected segment's `value`. */
  onChange: (value: string) => void;
  /** Shared `name` for the underlying radios. Generated when omitted — pass one
   *  only when the segments must join a wider native group (e.g. a real
   *  `<form>`). */
  name?: string;
}

/** `select` brings `value` / `onChange` with it and `standard` refuses them, so
 *  the mode a platter is in decides which props it will even accept. */
export type PlatterProps = PlatterStandardProps | PlatterSelectProps;

/**
 * A capsule platter — a tray holding a row or column of icon and text buttons.
 * Mix `icon`- and `text`-bearing items freely; each segment lights up on hover
 * and paints the accent when selected. Drop it anywhere: it hugs its contents
 * (`width: fit-content`).
 *
 * The tray comes in two modes, because the same shape is used for two different
 * jobs and they answer to different props:
 *
 * - **`standard`** (the default) — independent actions and toggles. Each segment
 *   has its own `onClick`, and any number of them can be `active`. The tray is a
 *   `toolbar`.
 * - **`select`** — one choice out of several, like a radio group wearing the
 *   tray's clothes. The group takes `value` / `onChange`, exactly one segment is
 *   ever lit, and the tray is a `radiogroup`.
 *
 * Select mode is built over real radio inputs, so arrow-key roving, the single
 * tab stop and form semantics all come from the platform rather than from key
 * handlers here — the same trade `RadioGroup` makes.
 */
export function Platter(props: PlatterProps) {
  const { items, orientation = 'horizontal', label, className } = props;
  // Narrowed once, into a `const`, so the select branch's props stay narrowed
  // inside the map callback below (a parameter's narrowing would not survive the
  // nested function).
  const sel = props.mode === 'select' ? props : undefined;
  const id = useId();

  return (
    <div
      className={cx('pp-platter', orientation === 'vertical' && 'is-vertical', className)}
      role={sel ? 'radiogroup' : 'toolbar'}
      aria-label={label}
      aria-orientation={orientation}
    >
      {items.map((item, i) => {
        const hasText = item.text != null;
        const name = item.label ?? (typeof item.text === 'string' ? item.text : undefined);
        const body = (
          <>
            {item.icon}
            {hasText && <span>{item.text}</span>}
          </>
        );
        const segCls = cx(
          'pp-platter-btn',
          sel && 'pp-platter-seg',
          hasText && 'has-text',
          // A select platter lights the segment `value` points at; `active` is
          // the standard-mode switch and is deliberately ignored here.
          !sel && item.active && 'is-active',
        );

        if (sel) {
          const value = item.value ?? name ?? String(i);
          return (
            <label key={value} className={segCls} title={name}>
              {/* The input stays in the layout (0×0, transparent) so it keeps
                  focus and roving; the label around it is what you see. An
                  icon-only segment has no text to name it, so the name goes
                  here rather than on the label. */}
              <input
                type="radio"
                name={sel.name ?? id}
                value={value}
                checked={sel.value === value}
                disabled={item.disabled}
                onChange={() => sel.onChange(value)}
                aria-label={name}
              />
              {body}
            </label>
          );
        }

        return (
          <button
            key={i}
            type="button"
            className={segCls}
            onClick={item.onClick}
            disabled={item.disabled}
            aria-pressed={item.active}
            aria-label={name}
            title={name}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
