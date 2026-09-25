import type { ReactNode } from 'react';
import { cx } from './util';

export interface GaugeRowProps {
  /** The gauges — usually two to four `Gauge`s. */
  children: ReactNode;
  className?: string;
}

/**
 * `.gauge-row` — the strip a set of `Gauge` dials sits in, spaced evenly across
 * the plate and hung from a common top edge so their captions line up.
 */
export function GaugeRow({ children, className }: GaugeRowProps) {
  return <div className={cx('gauge-row', className)}>{children}</div>;
}
