import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import { ControlRow } from './ControlRow';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  disabled?: boolean;
}

/**
 * A controlled `.switch-row` — the capsule on/off switch, optionally paired with
 * a label + hint. The whole row is the click target (it's a `<label>`).
 */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps, ref) {
  return (
    <ControlRow as="label" label={label} hint={hint}>
      <span className="switch">
        <input ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="track" />
      </span>
    </ControlRow>
  );
});
