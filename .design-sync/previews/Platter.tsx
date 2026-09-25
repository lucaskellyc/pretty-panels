import { Panel, Platter } from 'pretty-panels';

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
const STOP = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  </svg>
);
const DOT = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
);
const MOVE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
  </svg>
);
const ROTATE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" />
  </svg>
);
const SCALE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 15v5h5M20 9V4h-5M9 4H4v5M15 20h5v-5" />
  </svg>
);
const CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M4 12.5l5 5 11-11" />
  </svg>
);
const PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const cluster = { display: 'flex', padding: '8px 0' };

/** The canonical use: an icon-only transport tray as a single choice —
 *  `mode="select"`, so `value` alone decides which segment is lit. */
export function Transport() {
  return (
    <Panel title="Transport" width={320}>
      <div style={cluster}>
        <Platter
          mode="select"
          label="Transport"
          value="stop"
          onChange={noop}
          items={[
            { value: 'play', icon: PLAY, label: 'Play' },
            { value: 'pause', icon: PAUSE, label: 'Pause' },
            { value: 'stop', icon: STOP, label: 'Stop' },
            { value: 'record', icon: DOT, label: 'Record', disabled: true },
          ]}
        />
      </div>
    </Panel>
  );
}

/** The default `standard` mode: independent toggles. Both are on at once — which no
 *  select tray can do — and each segment carries its own handler. */
export function Standard() {
  return (
    <Panel title="Snapping" width={320}>
      <div style={cluster}>
        <Platter
          label="Snapping"
          items={[
            { icon: CHECK, text: 'Snap', active: true, onClick: noop },
            { icon: PLUS, text: 'Grid', active: true, onClick: noop },
            { icon: DOT, text: 'Magnet', disabled: true },
          ]}
        />
      </div>
    </Panel>
  );
}

/** Segments mix an icon with text; `orientation="vertical"` stacks the tray. */
export function Vertical() {
  return (
    <Panel title="Transform tool" width={320}>
      <div style={cluster}>
        <Platter
          mode="select"
          orientation="vertical"
          label="Transform tool"
          value="move"
          onChange={noop}
          items={[
            { value: 'move', icon: MOVE, text: 'Move' },
            { value: 'rotate', icon: ROTATE, text: 'Rotate' },
            { value: 'scale', icon: SCALE, text: 'Scale' },
          ]}
        />
      </div>
    </Panel>
  );
}

/** Text-only segments — the tray at its most segmented-control-like. `value`
 *  falls back to the segment's `text` when no explicit one is given. */
export function TextOnly() {
  return (
    <Panel title="Snap" width={320}>
      <div style={cluster}>
        <Platter
          mode="select"
          label="Snap mode"
          value="Grid"
          onChange={noop}
          items={[{ text: 'Off' }, { text: 'Grid' }, { text: 'Bar' }]}
        />
      </div>
    </Panel>
  );
}
