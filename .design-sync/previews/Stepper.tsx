import { Panel, Stepper } from 'pretty-panels';

const noop = () => {};

/** The canonical use: discrete values with bounds and a formatted readout. */
export function Render() {
  return (
    <Panel title="Render" width={320}>
      <Stepper
        label="Texture size"
        hint="Power-of-two increments"
        value={256}
        min={64}
        max={512}
        step={64}
        onChange={noop}
        format={(v) => `${v}px`}
      />
      <Stepper label="Samples" hint="Rays per pixel" value={8} min={1} max={16} onChange={noop} />
      <Stepper label="Bias" hint="No bounds — steps forever" value={0} step={0.25} onChange={noop} />
    </Panel>
  );
}

/** At a bound the corresponding button disables — here both ends and disabled. */
export function Bounds() {
  return (
    <Panel title="Bounds" width={320}>
      <Stepper label="At minimum" hint="− is disabled" value={1} min={1} max={16} onChange={noop} />
      <Stepper label="At maximum" hint="+ is disabled" value={16} min={1} max={16} onChange={noop} />
      <Stepper label="Disabled" hint="Both buttons dimmed" value={8} min={1} max={16} disabled onChange={noop} />
    </Panel>
  );
}

/** `format` decorates the readout without touching the underlying number. */
export function Formats() {
  return (
    <Panel title="Formatting" width={320}>
      <Stepper label="Tempo" value={120} min={40} max={240} step={1} onChange={noop} format={(v) => `${v} bpm`} />
      <Stepper label="Opacity" value={0.75} min={0} max={1} step={0.05} onChange={noop} format={(v) => `${Math.round(v * 100)}%`} />
      <Stepper label="Offset" value={-2} step={1} onChange={noop} format={(v) => (v > 0 ? `+${v}` : `${v}`)} />
    </Panel>
  );
}
