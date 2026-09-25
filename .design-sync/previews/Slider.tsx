import { Panel, Slider } from 'pretty-panels';

const noop = () => {};

/** The canonical use: label + value + capsule track, several to a plate. */
export function Camera() {
  return (
    <Panel title="Camera" width={320}>
      <Slider label="focus" value={42} min={0} max={100} step={1} onChange={noop} />
      <Slider
        label="aperture"
        value={2.8}
        min={1.4}
        max={16}
        step={0.1}
        onChange={noop}
        format={(v) => `f/${v.toFixed(1)}`}
      />
      <Slider
        label="gain"
        value={0.6}
        min={0}
        max={1}
        step={0.01}
        onChange={noop}
        format={(v) => `${Math.round(v * 100)}%`}
      />
    </Panel>
  );
}

/** `format` only changes the readout — the fill still comes from `value`. */
export function Formats() {
  return (
    <Panel title="Formatting" width={320}>
      <Slider
        label="field_of_view"
        value={90}
        min={30}
        max={140}
        step={1}
        onChange={noop}
        format={(v) => `${v}°`}
      />
      <Slider
        label="mix"
        value={0.35}
        min={0}
        max={1}
        step={0.01}
        onChange={noop}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider
        label="bitrate"
        value={320}
        min={64}
        max={512}
        step={32}
        onChange={noop}
        format={(v) => `${v} kb/s`}
      />
    </Panel>
  );
}

/** The fill at both ends of the range, and dead centre. */
export function Extremes() {
  return (
    <Panel title="Range" width={320}>
      <Slider label="at_min" value={0} min={0} max={100} step={1} onChange={noop} />
      <Slider label="midpoint" value={50} min={0} max={100} step={1} onChange={noop} />
      <Slider label="at_max" value={100} min={0} max={100} step={1} onChange={noop} />
    </Panel>
  );
}
