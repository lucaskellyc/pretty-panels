import { type ReactNode, useId } from 'react';

export interface GaugeProps {
  /** Current reading. */
  value: number;
  /** Bottom of the swept range. */
  min?: number;
  /** Top of the swept range. */
  max?: number;
  /** Caption under the dial. */
  label?: ReactNode;
  /** Format the number in the middle. The arc still fills from `value`, so a
   *  3.4-out-of-10 reading shows "3.4" on a 34%-full dial. */
  format?: (v: number) => string;
  /** Paint the fill with the accent instead of the muted gauge fill. */
  accent?: boolean;
}

/**
 * The `.arc` gauge — a read-only 270° dial with a rounded fill, a tabular
 * readout in the middle, and a caption beneath. Purely a display: there is
 * nothing to drag. Lay several out with `GaugeRow`.
 *
 * The dial's centre is punched out in the plate color, so a gauge expects a
 * Panel (or another `--ctl-panel` ground) underneath it.
 */
export function Gauge({ value, min = 0, max = 100, label, format, accent }: GaugeProps) {
  const id = useId();
  const labelId = label != null ? id : undefined;
  // The arc sweeps on a unitless 0–100 --fill; the CSS multiplies it into both
  // the conic-gradient stop and the leading end-cap's rotation.
  const span = max - min;
  const raw = span === 0 ? 0 : ((value - min) / span) * 100;
  const fill = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

  return (
    <div className="arc-gauge">
      <div
        className={accent ? 'arc is-accent' : 'arc'}
        style={{ ['--fill' as string]: fill }}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={format ? format(value) : undefined}
        aria-labelledby={labelId}
      >
        <span className="arc-value">{format ? format(value) : value}</span>
      </div>
      {label != null && (
        <span className="arc-label" id={labelId}>
          {label}
        </span>
      )}
    </div>
  );
}
