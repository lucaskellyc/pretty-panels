import type { ReactNode } from 'react';

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
export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <label className="switch-row">
      {(label != null || hint != null) && (
        <span className="switch-meta">
          {label != null && <span className="control-name">{label}</span>}
          {hint != null && <span className="switch-hint">{hint}</span>}
        </span>
      )}
      <span className="switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="track" />
      </span>
    </label>
  );
}
