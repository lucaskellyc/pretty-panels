import type { ReactNode } from 'react';
import { Panel, Vector } from 'pretty-panels';

const noop = () => {};

/** A labelled row, matching how the repo's own docs lay Vector out. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '8px 0',
      }}
    >
      <span style={{ font: 'var(--type-label)', color: 'var(--ctl-text)' }}>{label}</span>
      {children}
    </div>
  );
}

/** The canonical use: 2, 3 and 4 field capsules. One field per entry in `value`. */
export function Arities() {
  return (
    <Panel title="Vectors" width={320}>
      <Row label="vec2 · uv">
        <Vector value={[0.5, 0.5]} min={0} max={1} step={0.01} onChange={noop} />
      </Row>
      <Row label="vec3 · position">
        <Vector value={[0, 1.6, -4]} step={0.1} onChange={noop} />
      </Row>
      <Row label="vec4 · rotation">
        <Vector value={[0, 0, 0, 1]} step={0.01} onChange={noop} />
      </Row>
    </Panel>
  );
}

/** `colorMode` paints each field with its own live rgb component. */
export function ColorMode() {
  return (
    <Panel title="Colour" width={320}>
      <Row label="rgb · accent">
        <Vector value={[80, 200, 120]} colorMode step={1} min={0} max={255} onChange={noop} />
      </Row>
      <Row label="rgb · warm">
        <Vector value={[230, 140, 60]} colorMode step={1} min={0} max={255} onChange={noop} />
      </Row>
      <Row label="rgb · deep">
        <Vector value={[40, 60, 140]} colorMode step={1} min={0} max={255} onChange={noop} />
      </Row>
    </Panel>
  );
}
