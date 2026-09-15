import type { ReactNode } from 'react';
import { ControlRow } from './ControlRow';

export interface TextFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Native spellcheck. Off by default — these fields usually hold identifiers
   *  (`untitled_01`) rather than prose. */
  spellCheck?: boolean;
}

/**
 * The `.text-field` control — a track capsule for free-form entry, set in the
 * mono face so typed identifiers line up with the numeric readouts around them.
 */
export function TextField({
  value,
  onChange,
  label,
  hint,
  placeholder,
  disabled,
  spellCheck = false,
}: TextFieldProps) {
  return (
    <ControlRow as="label" label={label} hint={hint}>
      <input
        type="text"
        className="text-field"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={spellCheck}
        onChange={(e) => onChange(e.target.value)}
      />
    </ControlRow>
  );
}
