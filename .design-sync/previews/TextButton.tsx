import { Panel, TextButton } from 'pretty-panels';

const noop = () => {};

/* Icons handed to the library must carry their own width/height — the library
   places the node and does not size it. */
const PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M4 12.5l5 5 11-11" />
  </svg>
);

const cluster = { display: 'flex', gap: 12, flexWrap: 'wrap' as const, padding: '8px 0' };

/** The canonical set: plain, with a leading icon, accented, and disabled. The
 *  accent here marks the primary action — the `Apply` beside a `Cancel`. */
export function Variants() {
  return (
    <Panel title="Actions" width={320}>
      <div style={cluster}>
        <TextButton onClick={noop}>Cancel</TextButton>
        <TextButton icon={PLUS} onClick={noop}>
          Add layer
        </TextButton>
      </div>
      <div style={cluster}>
        <TextButton active onClick={noop}>
          Apply
        </TextButton>
        <TextButton disabled>Unavailable</TextButton>
      </div>
    </Panel>
  );
}

/** `mode="toggle"` — the same accent, but now it is a state: `active` says on,
 *  `onChange` reports the press, and `aria-pressed` tells assistive tech. */
export function Toggle() {
  return (
    <Panel title="Toggles" width={320}>
      <div style={cluster}>
        <TextButton mode="toggle" active={false} onChange={noop}>
          Off
        </TextButton>
        <TextButton mode="toggle" active onChange={noop}>
          On
        </TextButton>
      </div>
      <div style={cluster}>
        <TextButton mode="toggle" icon={CHECK} active={false} onChange={noop}>
          Snap off
        </TextButton>
        <TextButton mode="toggle" icon={CHECK} active onChange={noop}>
          Snap on
        </TextButton>
      </div>
    </Panel>
  );
}
