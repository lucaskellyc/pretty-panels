import { Gauge, GaugeRow, Panel } from 'pretty-panels';

const noop = () => {};

const oneDecimal = (v: number) => v.toFixed(1);

/** The canonical use: a read-only 270° dial with a caption, several to a row. */
export function Telemetry() {
  return (
    <Panel title="Telemetry" width={320}>
      <GaugeRow>
        <Gauge label="cpu" value={60} format={(v) => String(Math.round(v))} />
        <Gauge label="latency" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="queue" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
    </Panel>
  );
}

/** `accent` paints the fill with the accent instead of the muted gauge fill. */
export function AccentVsMuted() {
  return (
    <Panel title="Fill" width={320}>
      <GaugeRow>
        <Gauge label="muted" value={72} />
        <Gauge label="accent" value={72} accent />
      </GaugeRow>
    </Panel>
  );
}

/** The swept range and the printed number are independent — 3.4-of-10 reads "3.4" on a 34% arc. */
export function RangeVsReadout() {
  return (
    <Panel title="Range" width={320}>
      <GaugeRow>
        <Gauge label="empty" value={0} min={0} max={10} format={oneDecimal} />
        <Gauge label="partial" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="full" value={10} min={0} max={10} format={oneDecimal} />
      </GaugeRow>
    </Panel>
  );
}
