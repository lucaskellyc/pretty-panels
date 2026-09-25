import { Panel, Section, Slider, Toggle } from 'pretty-panels';

const noop = () => {};

/** The canonical use: collapsible groups nested inside a Panel. */
export function InPanel() {
  return (
    <Panel title="Inspector" width={320}>
      <Section title="Camera">
        <Slider label="focus" value={42} min={0} max={100} step={1} onChange={noop} />
        <Toggle checked onChange={noop} label="Snap" />
      </Section>
      <Section title="Advanced" defaultOpen={false}>
        <Slider label="gain" value={0.6} min={0} max={1} step={0.01} onChange={noop} />
      </Section>
    </Panel>
  );
}

/** Open and closed side by side — `defaultOpen` is the only state prop. */
export function OpenAndClosed() {
  return (
    <Panel title="States" width={320}>
      <Section title="Open by default">
        <Toggle checked onChange={noop} label="Visible" hint="The body is expanded" />
      </Section>
      <Section title="Closed by default" defaultOpen={false}>
        <Toggle checked={false} onChange={noop} label="Hidden" />
      </Section>
    </Panel>
  );
}

/** Several sections stack into a full inspector column. */
export function Stacked() {
  return (
    <Panel title="Scene" width={320}>
      <Section title="Transform">
        <Slider label="rotate_y" value={35} min={0} max={360} step={1} onChange={noop} format={(v) => `${v}°`} />
      </Section>
      <Section title="Material" defaultOpen={false}>
        <Slider label="roughness" value={0.4} min={0} max={1} step={0.01} onChange={noop} />
      </Section>
      <Section title="Lighting" defaultOpen={false}>
        <Toggle checked onChange={noop} label="Cast shadows" />
      </Section>
    </Panel>
  );
}
