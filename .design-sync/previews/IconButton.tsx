import { IconButton, Panel } from 'pretty-panels';

const noop = () => {};

/* Icons handed to the library must carry their own width/height — the library
   places the node and does not size it. */
const PLAY = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor" />
  </svg>
);
const PAUSE = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
  </svg>
);
const DOT = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
);
const STOP = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  </svg>
);

const cluster = { display: 'flex', gap: 12, flexWrap: 'wrap' as const, padding: '8px 0' };

/** The canonical use: a transport cluster of plain actions, one of them
 *  accented as the primary. The default `mode="standard"` is implied. */
export function Transport() {
  return (
    <Panel title="Transport" width={320}>
      <div style={cluster}>
        <IconButton label="Play" active onClick={noop}>
          {PLAY}
        </IconButton>
        <IconButton label="Pause" onClick={noop}>
          {PAUSE}
        </IconButton>
        <IconButton label="Stop" onClick={noop}>
          {STOP}
        </IconButton>
        <IconButton label="Record" disabled>
          {DOT}
        </IconButton>
      </div>
    </Panel>
  );
}

/** `mode="toggle"` — a two-state control. `active` is the state, `onChange`
 *  reports the press, and the button is announced as a pressed toggle. */
export function Toggle() {
  return (
    <Panel title="Toggles" width={320}>
      <div style={cluster}>
        <IconButton mode="toggle" label="Record off" active={false} onChange={noop}>
          {DOT}
        </IconButton>
        <IconButton mode="toggle" label="Record on" active onChange={noop}>
          {DOT}
        </IconButton>
      </div>
    </Panel>
  );
}

/** The three tiers side by side, then disabled: quiet by default, the capsule
 *  track for an accented action, the accent for a toggle that is on. */
export function States() {
  return (
    <Panel title="States" width={320}>
      <div style={cluster}>
        <IconButton label="Standard" onClick={noop}>
          {DOT}
        </IconButton>
        <IconButton label="Prominent" active onClick={noop}>
          {DOT}
        </IconButton>
        <IconButton mode="toggle" label="On" active onChange={noop}>
          {DOT}
        </IconButton>
        <IconButton label="Disabled" disabled>
          {DOT}
        </IconButton>
      </div>
    </Panel>
  );
}
