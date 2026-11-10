import { cx } from './util';

export interface ProgressBarProps {
  /** How far along, 0–1. Omit for an indeterminate bar: full width, stripes
   *  running, for work that can't say how much is left. */
  value?: number;
  /** Candy-stripe the fill and run the stripes. Left unset, they come on by
   *  themselves once the bar is full (or indeterminate), so a finished load
   *  reads as "wrapping up" rather than stalled at 100%. */
  striped?: boolean;
  /** Accessible name, when nothing on screen labels the bar. */
  label?: string;
  /** Id of the element that labels the bar, when something on screen does. */
  labelledBy?: string;
  /** Extra class names on the track. */
  className?: string;
}

/**
 * A capsule track with a rounded fill — load progress at a glance. Purely a
 * display. When the fill reaches the end it turns to animated candy stripes,
 * the barber-pole that says the last of the work is still settling.
 *
 * Track and fill colours come from `--pp-progress-track` and
 * `--pp-progress-fill`, so a surface with its own ground (the SplashScreen's
 * artwork) can restyle it without a new prop.
 */
export function ProgressBar({ value, striped, label, labelledBy, className }: ProgressBarProps) {
  const pct = value != null ? Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10 : null;
  const stripes = striped ?? (pct == null || pct >= 100);

  return (
    <div
      className={cx('pp-progress', className)}
      role="progressbar"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      style={{ ['--pp-progress-value' as string]: `${pct ?? 100}%` }}
    >
      <div className={cx('pp-progress-fill', stripes && 'is-striped')} />
    </div>
  );
}
