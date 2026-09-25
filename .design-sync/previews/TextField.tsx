import { Panel, TextField } from 'pretty-panels';

const noop = () => {};

/** The canonical use: identifiers in the mono face, lined up with the readouts around them. */
export function Document() {
  return (
    <Panel title="Document" width={320}>
      <TextField label="Name" hint="Free-form entry" value="untitled_01" onChange={noop} />
      <TextField label="Tag" hint="Placeholder when empty" value="" placeholder="none" onChange={noop} />
    </Panel>
  );
}

/** Filled, empty-with-placeholder, and disabled. */
export function States() {
  return (
    <Panel title="States" width={320}>
      <TextField label="Filled" value="take_04_final" onChange={noop} />
      <TextField label="Empty" placeholder="placeholder text" value="" onChange={noop} />
      <TextField label="Disabled" hint="Dimmed, not interactive" value="locked_asset" disabled onChange={noop} />
    </Panel>
  );
}

/** Label and hint are optional — the bare capsule is a valid row. */
export function Bare() {
  return (
    <Panel title="No label" width={320}>
      <TextField value="bare_field" onChange={noop} />
    </Panel>
  );
}
