import type { ReactNode } from 'react';

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
  return <div className={className ? `gauge-row ${className}` : 'gauge-row'}>{children}</div>;
}
