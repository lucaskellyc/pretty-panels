import type { ReactNode } from 'react';
import { ControlRow } from './ControlRow';

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
 * The `.dropdown` control — a native `<select>` restyled as a track capsule,
 * with the chevron drawn alongside it so it inherits the control's color (and
 * so retints with the `--ctl-*` tokens like everything else).
 */
export function Select({ value, onChange, options, label, hint, disabled }: SelectProps) {
  return (
    <ControlRow as="label" label={label} hint={hint}>
      <span className="dropdown">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => {
            const opt = toOption(o);
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label ?? opt.value}
              </option>
            );
          })}
        </select>
        <svg
          className="dropdown-chevron"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    </ControlRow>
  );
}
