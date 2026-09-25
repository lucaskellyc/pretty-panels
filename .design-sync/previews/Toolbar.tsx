import { Platter, Readout, Toolbar } from 'pretty-panels';

const noop = () => {};

/* Icons handed to the library must carry their own width/height — the library
   places the node and does not size it. */
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

/* Every other preview in this set wraps its cells in a `Panel`, for a guaranteed
   --ctl-panel ground. A Toolbar paints nothing of its own, so a Panel would work
   here too — this one takes the stage by choice, not necessity: it is the ground
   an app floats its chrome on, and it shows what a surfaceless bar is for, the
   platters reading as the only objects in the row. */
const stage = {
  background: 'var(--stage-bg)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-lg)',
};

/** The canonical use: tools on the leading edge, status pinned to the far one. */
export function Viewport() {
  return (
    <div style={stage}>
      <Toolbar
        label="Viewport"
        end={
          <>
            <Readout label="FPS" value="60" />
            <Readout value="1920×1080" />
          </>
        }
      >
        <Platter
          mode="select"
          label="Transform tool"
          value="move"
          onChange={noop}
          items={[
            { value: 'move', icon: MOVE, label: 'Move' },
            { value: 'rotate', icon: ROTATE, label: 'Rotate' },
            { value: 'scale', icon: SCALE, label: 'Scale' },
          ]}
        />
        <Platter
          label="Snapping"
          items={[
            { icon: CHECK, text: 'Snap', active: true, onClick: noop },
            { icon: PLUS, text: 'Grid', onClick: noop },
          ]}
        />
      </Toolbar>
    </div>
  );
}

/** Controls only — no `end`, so the bar simply hugs what it is given. */
export function ControlsOnly() {
  return (
    <div style={stage}>
      <Toolbar label="Snapping">
        <Platter
          label="Snapping"
          items={[
            { icon: CHECK, text: 'Snap', active: true, onClick: noop },
            { icon: PLUS, text: 'Grid', onClick: noop },
          ]}
        />
      </Toolbar>
    </div>
  );
}

/** `orientation="vertical"` turns the strip into a tool palette down a side. */
export function Vertical() {
  return (
    <div style={{ ...stage, width: 'fit-content' }}>
      <Toolbar
        orientation="vertical"
        label="Tools"
        end={<Readout label="zoom" value="100%" />}
      >
        <Platter
          mode="select"
          orientation="vertical"
          label="Transform tool"
          value="rotate"
          onChange={noop}
          items={[
            { value: 'move', icon: MOVE, text: 'Move' },
            { value: 'rotate', icon: ROTATE, text: 'Rotate' },
            { value: 'scale', icon: SCALE, text: 'Scale' },
          ]}
        />
      </Toolbar>
    </div>
  );
}
