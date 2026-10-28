import { type CSSProperties, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { ControlRow } from './ControlRow';
import { Menu } from './Menu';
import { cx } from './util';

export interface SelectOption {
  /** The value reported to `onChange`. */
  value: string;
  /** Visible text. Defaults to `value`. */
  label?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  /** The choices. A bare string is shorthand for `{ value: theString }`. */
  options: (string | SelectOption)[];
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  disabled?: boolean;
}

/** Normalize the `string | SelectOption` shorthand. */
const toOption = (o: string | SelectOption): SelectOption => (typeof o === 'string' ? { value: o } : o);

/**
 * The `.dropdown` control — a track capsule showing the current choice, which
 * opens the choices as a `Menu` hung off it. The current one carries the tick,
 * so the list reads the way a platform popup button's does, and choosing gets
 * the menu's confirming blink before `onChange` fires.
 *
 * A `Menu` rather than a native `<select>` so the list is drawn by the kit, on
 * the kit's own sheet, instead of by the platform in whatever it draws with —
 * the one part of this control that never took the theme.
 *
 * Keyboard: Enter, Space, ArrowDown or ArrowUp on the capsule opens the list
 * with focus on the current choice; from there it is the menu's keyboard.
 */
export function Select({ value, onChange, options, label, hint, disabled }: SelectProps) {
  const id = useId();
  const labelId = label != null ? `${id}-label` : undefined;
  const triggerId = `${id}-trigger`;
  const trigger = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  /** The capsule's width when the list opened — the list is at least as wide,
   *  the way a popup button's is, so it never reads as narrower than the
   *  control it came out of. */
  const [width, setWidth] = useState(0);

  const opts = options.map(toOption);
  const current = opts.find((o) => o.value === value);

  const show = () => {
    if (disabled) return;
    setWidth(trigger.current?.offsetWidth ?? 0);
    setOpen(true);
  };

  // Land on the current choice rather than the first one. `Popover` has already
  // focused its first command by now — its layout effect runs before this one,
  // being a child's — so this only moves it, and before the frame paints. A
  // disabled current choice cannot take focus, and the first command stands.
  useLayoutEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('.pp-menu-item[aria-checked="true"]:not(:disabled)')?.focus();
  }, [open]);

  return (
    // A `div`, not a `label`: the menu renders inside the row, and a press on a
    // command inside a `<label>` would also click the capsule and reopen it.
    // `aria-labelledby` names the capsule instead.
    <ControlRow label={label} hint={hint} labelId={labelId}>
      <span
        ref={wrap}
        className="dropdown"
        style={width ? ({ '--pp-select-w': `${width}px` } as CSSProperties) : undefined}
      >
        <button
          ref={trigger}
          id={triggerId}
          type="button"
          className={cx('dropdown-trigger', open && 'is-open')}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-labelledby={labelId ? `${labelId} ${triggerId}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              show();
            }
          }}
        >
          <span className="dropdown-value">{current?.label ?? current?.value ?? value}</span>
          <svg
            className="dropdown-chevron"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            aria-hidden="true"
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <Menu
          open={open}
          onClose={() => setOpen(false)}
          anchor={trigger}
          className="pp-select-menu"
          label={typeof label === 'string' ? label : undefined}
          items={opts.map((o) => ({
            id: o.value,
            label: o.label ?? o.value,
            checked: o.value === value,
            disabled: o.disabled,
          }))}
          onSelect={(v) => {
            if (v !== value) onChange(v);
          }}
        />
      </span>
    </ControlRow>
  );
}
