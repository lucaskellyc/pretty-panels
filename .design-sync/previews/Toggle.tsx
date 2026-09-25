import { Panel, Toggle } from 'pretty-panels';

const noop = () => {};

/** The canonical use: a stack of switches with labels and hint lines. */
export function Scene() {
  return (
    <Panel title="Scene" width={320}>
      <Toggle checked onChange={noop} label="Grid" hint="Reference floor grid" />
      <Toggle checked={false} onChange={noop} label="Ambient light" hint="Fill the scene" />
      <Toggle checked onChange={noop} label="Snap to grid" />
    </Panel>
  );
}

/** Every state the switch can be in. */
export function States() {
  return (
    <Panel title="States" width={320}>
      <Toggle checked onChange={noop} label="On" hint="Accent track, knob right" />
      <Toggle checked={false} onChange={noop} label="Off" hint="Muted track, knob left" />
      <Toggle checked disabled onChange={noop} label="On · disabled" hint="Dimmed, not interactive" />
      <Toggle checked={false} disabled onChange={noop} label="Off · disabled" />
    </Panel>
  );
}

/** Label and hint are both optional — the switch alone is a valid row. */
export function Bare() {
  return (
    <Panel title="No label" width={320}>
      <Toggle checked onChange={noop} />
      <Toggle checked={false} onChange={noop} />
    </Panel>
  );
}
