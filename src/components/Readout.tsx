import type { ReactNode } from 'react';
import { cx } from './util';

export interface ReadoutProps {
  /** The value on show. Set in the mono face with tabular figures, so a column
   *  of them stays aligned as the digits change. */
  value: ReactNode;
  /** Optional caption ahead of the value — "aperture f/2.8". */
  label?: ReactNode;
  /** Paint the capsule with the accent, the way `Gauge` accents its fill: this
   *  is a value someone set rather than one the panel is merely reporting. */
  accent?: boolean;
  className?: string;
}

/**
 * `.pp-readout` — a capsule that states a value and nothing else. No handler,
 * no disabled state: there is nothing here to touch.
 *
 * It hugs its content, so it sits inline in a `Section` header, at the end of a
 * row, or anywhere a number needs a frame. The ground is deliberately *not* a
 * capsule track — that recessed surface is the language of controls you aim at
 * (sliders, steppers, fields). A readout is passive, so it rests just off the
 * plate on `--ctl-row` and carries `--ctl-text`, which also keeps it legible
 * dropped straight onto a plate or a section.
 */
export function Readout({ value, label, accent = false, className }: ReadoutProps) {
  return (
    <span className={cx('pp-readout', accent && 'is-accent', className)}>
      {label != null && <span className="pp-readout-label">{label}</span>}
      <span className="pp-readout-value">{value}</span>
    </span>
  );
}
