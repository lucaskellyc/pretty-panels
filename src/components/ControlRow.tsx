import type { ReactNode } from 'react';

export interface ControlRowProps {
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  /** Put an id on the label span so a composite control can point at it with
   *  `aria-labelledby`. */
  labelId?: string;
  /** Render as a `<label>` so clicking anywhere in the row reaches the control.
   *  Composite controls (a stepper's two buttons, a radio group) must stay a
   *  `<div>` — a `<label>` wrapping several controls has no defined target. */
  as?: 'div' | 'label';
  /** The control itself, sitting at the right of the row. */
  children: ReactNode;
}

/**
 * Internal `.switch-row` scaffold: the bold label + hint meta on the left, the
 * control on the right. Shared by every labelled control so they line up on the
 * same baseline grid inside a Panel.
 */
export function ControlRow({ label, hint, labelId, as: Tag = 'div', children }: ControlRowProps) {
  return (
    <Tag className="switch-row">
      {(label != null || hint != null) && (
        <span className="switch-meta">
          {label != null && (
            <span className="control-name" id={labelId}>
              {label}
            </span>
          )}
          {hint != null && <span className="switch-hint">{hint}</span>}
        </span>
      )}
      {children}
    </Tag>
  );
}
