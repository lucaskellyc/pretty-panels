import { Gauge, GaugeRow, Panel, Slider } from 'pretty-panels';

const noop = () => {};

const oneDecimal = (v: number) => v.toFixed(1);

/** The canonical use: three dials spaced evenly, captions hung from a common top edge. */
export function ThreeUp() {
  return (
    <Panel title="Telemetry" width={320}>
      <GaugeRow>
        <Gauge label="metric_one" value={60} />
        <Gauge label="metric_two" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="metric_three" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
    </Panel>
  );
}

/** Two dials spread across the same plate width. */
export function TwoUp() {
  return (
    <Panel title="Load" width={320}>
      <GaugeRow>
        <Gauge label="cpu" value={48} format={(v) => String(Math.round(v))} />
        <Gauge label="gpu" value={81} format={(v) => String(Math.round(v))} accent />
      </GaugeRow>
    </Panel>
  );
}

/** The row sits happily above the controls that drive it. */
export function WithControls() {
  return (
    <Panel title="Monitor" width={320}>
      <GaugeRow>
        <Gauge label="cpu" value={60} format={(v) => String(Math.round(v))} />
        <Gauge label="mem" value={4.2} min={0} max={8} format={oneDecimal} accent />
      </GaugeRow>
      <Slider label="cpu_load" value={60} min={0} max={100} step={1} onChange={noop} format={(v) => `${v}%`} />
    </Panel>
  );
}
