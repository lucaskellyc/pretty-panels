import { Panel, Select } from 'pretty-panels';

const noop = () => {};

/** The canonical use: bare-string options, and objects that carry their own label. */
export function Viewport() {
  return (
    <Panel title="Viewport" width={320}>
      <Select
        label="Shading"
        hint="How the viewport draws"
        value="rendered"
        options={['wireframe', 'solid', 'material', 'rendered']}
        onChange={noop}
      />
      <Select
        label="Still format"
        hint="Objects add their own label"
        value="png"
        options={[
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPEG' },
          { value: 'exr', label: 'OpenEXR' },
          { value: 'tiff', label: 'TIFF (soon)', disabled: true },
        ]}
        onChange={noop}
      />
    </Panel>
  );
}

/** Disabled dims the capsule; label and hint are both optional. */
export function States() {
  return (
    <Panel title="States" width={320}>
      <Select label="Enabled" value="medium" options={['low', 'medium', 'high']} onChange={noop} />
      <Select label="Disabled" hint="Dimmed, not interactive" value="medium" options={['low', 'medium', 'high']} disabled onChange={noop} />
      <Select value="unlabelled" options={['unlabelled', 'no hint line']} onChange={noop} />
    </Panel>
  );
}
