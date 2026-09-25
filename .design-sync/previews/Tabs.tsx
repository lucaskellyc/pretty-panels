import { Panel, Slider, Tabs, Toggle } from 'pretty-panels';

const noop = () => {};

/** Handed to a Panel's `title`, the strip becomes the plate's flush header. */
export function AsPanelHeader() {
  return (
    <Panel
      width={320}
      title={<Tabs label="Panel sections" items={['camera', 'render', { id: 'output', disabled: true }]} value="camera" onChange={noop} />}
    >
      <Slider label="field_of_view" value={90} min={30} max={140} step={1} onChange={noop} format={(v) => `${v}°`} />
      <Toggle checked onChange={noop} label="vsync" hint="sync to display refresh" />
    </Panel>
  );
}

/** Dropped anywhere else it is a self-contained bar. */
export function Standalone() {
  return (
    <Panel title="Standalone strip" width={320}>
      <div style={{ padding: '8px 0' }}>
        <Tabs label="Views" items={['edit', 'mix', 'master']} value="mix" onChange={noop} />
      </div>
    </Panel>
  );
}

/** A bare string is shorthand for `{ id }`; an object adds `label` and `disabled`. */
export function ItemShapes() {
  return (
    <Panel title="Item shapes" width={320}>
      <div style={{ padding: '8px 0' }}>
        <Tabs
          label="Mixed items"
          items={[
            'plain',
            { id: 'relabelled', label: 'Re-labelled' },
            { id: 'off', label: 'Disabled', disabled: true },
          ]}
          value="plain"
          onChange={noop}
        />
      </div>
    </Panel>
  );
}
