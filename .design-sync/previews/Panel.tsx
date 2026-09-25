import { Gauge, GaugeRow, Panel, Slider, Toggle } from 'pretty-panels';

const noop = () => {};

/** The canonical plate: a header bar over a padded body of controls. */
export function Titled() {
  return (
    <Panel title="Camera" width={320}>
      <Slider label="focus" value={42} min={0} max={100} step={1} onChange={noop} />
      <Slider label="gain" value={0.6} min={0} max={1} step={0.01} onChange={noop} format={(v) => `${Math.round(v * 100)}%`} />
      <Toggle checked onChange={noop} label="Snap to grid" />
    </Panel>
  );
}

/** `title` is optional — the plate works as a bare surface. */
export function Untitled() {
  return (
    <Panel width={320}>
      <GaugeRow>
        <Gauge label="cpu" value={60} format={(v) => String(Math.round(v))} />
        <Gauge label="latency" value={3.4} min={0} max={10} format={(v) => v.toFixed(1)} />
      </GaugeRow>
    </Panel>
  );
}

/** `collapsible` adds a −/+ header toggle. Expanded here. */
export function Collapsible() {
  return (
    <Panel title="Render" width={320} collapsible>
      <Slider label="samples" value={8} min={1} max={64} step={1} onChange={noop} />
      <Toggle checked={false} onChange={noop} label="Denoise" hint="Post-process the result" />
    </Panel>
  );
}

/** Collapsed, the plate keeps its width and folds only the body away. */
export function Collapsed() {
  return (
    <Panel title="Advanced" width={320} collapsible defaultCollapsed>
      <Slider label="hidden" value={1} min={0} max={10} step={1} onChange={noop} />
    </Panel>
  );
}

/** `width` drives the plate through `--panel-w`; the default is 380px. */
export function Widths() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title="240px" width={240}>
        <Toggle checked onChange={noop} label="Narrow" />
      </Panel>
      <Panel title="320px" width={320}>
        <Toggle checked onChange={noop} label="Wider" />
      </Panel>
    </div>
  );
}
