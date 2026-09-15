import { type ReactNode, useId } from 'react';
import { ControlRow } from './ControlRow';

export interface RadioOption {
  /** The value reported to `onChange`. */
  value: string;
  /** Visible text beside the dot. Defaults to `value`. */
  label?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value: string;
  onChange: (v: string) => void;
  /** The choices. A bare string is shorthand for `{ value: theString }`. */
  options: (string | RadioOption)[];
  /** Shared `name` for the underlying radios. Generated when omitted — pass one
   *  only when the radios must join a wider native group (e.g. a real `<form>`). */
  name?: string;
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  /** Disable every choice in the group. */
  disabled?: boolean;
}

/** Normalize the `string | RadioOption` shorthand. */
const toOption = (o: string | RadioOption): RadioOption => (typeof o === 'string' ? { value: o } : o);

/**
 * The `.radio-group` control — a row of dot-and-label choices over real radio
 * inputs, so arrow-key roving and form semantics come from the platform. Reach
 * for it over a Select when there are only a few short options.
 */
export function RadioGroup({
  value,
  onChange,
  options,
  name,
  label,
  hint,
  disabled,
}: RadioGroupProps) {
  const id = useId();
  const labelId = label != null ? `${id}label` : undefined;
  return (
    <ControlRow label={label} hint={hint} labelId={labelId}>
      <span className="radio-group" role="radiogroup" aria-labelledby={labelId}>
        {options.map((o) => {
          const opt = toOption(o);
          return (
            <label className="radio" key={opt.value}>
              <input
                type="radio"
                name={name ?? id}
                value={opt.value}
                checked={value === opt.value}
                disabled={disabled || opt.disabled}
                onChange={() => onChange(opt.value)}
              />
              <span className="radio-dot" />
              {opt.label ?? opt.value}
            </label>
          );
        })}
      </span>
    </ControlRow>
  );
}
