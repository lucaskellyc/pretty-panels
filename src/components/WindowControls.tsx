import { type Platform, detectPlatform } from './platform';
import { cx } from './util';

export interface WindowControlsProps {
  /** Which platform's button order to follow — close leads on macOS, trails
   *  elsewhere. Auto-detected from the browser when omitted. */
  platform?: Platform;
  /** Drives the zoom glyph and the maximize button's label: a maximized window
   *  offers *restore*, and the triangles turn inward to say so. */
  maximized?: boolean;
  /** Unsaved work. Shows as a dot in the centre of the close button — where
   *  macOS puts it, and the one place a user already looks. It is the button's
   *  *resting* face, so hovering the cluster gives the dot up for the glyph
   *  rather than stacking the two, which is what makes it cost no room. */
  dirty?: boolean;
  /** Stand the traffic lights down to the monochrome rings, the way macOS' own
   *  Graphite appearance does. Reach for it when the cluster sits over artwork
   *  the colours would fight, or in an app whose chrome is deliberately
   *  uncoloured. No effect off macOS — Windows draws no rings, and the Linux
   *  desktops this kit follows have never had lights to stand down. */
  graphite?: boolean;
  /** Unfocused window: the traffic lights drop to 0% saturation, the way the
   *  system greys them out. `TitleBar` forwards its own `inactive` here, so
   *  this is only worth passing to a cluster you place yourself. */
  inactive?: boolean;
  /** Omit a handler and that button is not rendered — a window that can't be
   *  maximized simply doesn't pass `onMaximize`. */
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  className?: string;
}

/* 24×24 glyphs in the round-capped lucide idiom, drawn small (11px) inside a
   12px button, so the stroke has to be heavier than the kit's usual 2. */
const glyph = {
  viewBox: '0 0 24 24',
  width: 11,
  height: 11,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const CLOSE = (
  <svg {...glyph}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const MINIMIZE = (
  <svg {...glyph}>
    <path d="M5 12h14" />
  </svg>
);
/* The zoom light's corner triangles — solid, like the system's, because a
   stroked arrow turns to mush inside a 12px circle. Outward to fill the screen,
   inward once it is filled. */
const ZOOM = (
  <svg {...glyph} fill="currentColor" stroke="none">
    <path d="M5 5h9L5 14z" />
    <path d="M19 19h-9L19 10z" />
  </svg>
);
const RESTORE = (
  <svg {...glyph} fill="currentColor" stroke="none">
    <path d="M11 11H3l8-8z" />
    <path d="M13 13h8l-8 8z" />
  </svg>
);

/* ---- Windows' own glyphs ----
   Hairline strokes in a square idiom. The shapes are the platform's, not ours:
   a rule for minimize, an outlined square for maximize, and the two offset
   squares Windows has used for restore since 95. Only the glyphs and their
   plates are Windows here — the capsule around them is the kit's, as on macOS.

   Size and stroke move together. The viewBox is 24 units, so what actually
   draws is `strokeWidth * (width / 24)`; scaling the glyph without walking the
   stroke back down would fatten the lines away from the system's 1px. At 12px
   and 1.7 that lands on ~0.85px — the same weight the 10px/2 pairing had. */
const winGlyph = { ...glyph, width: 16, height: 16, strokeWidth: 2 };

const WIN_MINIMIZE = (
  <svg {...winGlyph}>
    <path d="M5 12h14" />
  </svg>
);
const WIN_MAXIMIZE = (
  <svg {...winGlyph}>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1" />
  </svg>
);
const WIN_RESTORE = (
  <svg {...winGlyph}>
    {/* The back square, clipped to the L the front one leaves visible. */}
    <path d="M8.5 8.5V7a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 18.5 7v7a1.5 1.5 0 0 1-1.5 1.5h-1.5" />
    <rect x="5.5" y="8.5" width="10" height="10" rx="1" />
  </svg>
);
const WIN_CLOSE = (
  <svg {...winGlyph}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </svg>
);

/** Glyph set per platform. Windows gets its own; macOS and Linux share the
 *  kit's round-capped set. */
const GLYPHS = {
  mac: { minimize: MINIMIZE, maximize: ZOOM, restore: RESTORE, close: CLOSE },
  win: { minimize: WIN_MINIMIZE, maximize: WIN_MAXIMIZE, restore: WIN_RESTORE, close: WIN_CLOSE },
  linux: { minimize: MINIMIZE, maximize: ZOOM, restore: RESTORE, close: CLOSE },
} as const;

/** Button order by platform. Ordering follows the *platform*, not the look —
 *  muscle memory is about where the button is. */
const ORDER: Record<Platform, ('minimize' | 'maximize' | 'close')[]> = {
  mac: ['close', 'minimize', 'maximize'],
  win: ['minimize', 'maximize', 'close'],
  linux: ['minimize', 'maximize', 'close'],
};

/**
 * Minimize, zoom and close as a frosted capsule of rings — the cluster a
 * frameless window needs, drawn by the kit rather than the OS.
 *
 * The rings are the whole idea: at rest each button is an outline and nothing
 * else, so the cluster reads as three quiet dots over whatever is behind it.
 * Hovering *the capsule* — not the individual button — fills all three and
 * fades their glyphs in, which is the trade the system lights make and the
 * reason the glyphs can be legible without being noise.
 *
 * On macOS those outlines are the system's own red, amber and green, so the
 * cluster is recognisable at a glance without borrowing the filled discs; pass
 * `graphite` for the monochrome set instead, or `inactive` to grey them for an
 * unfocused window.
 *
 * `TitleBar` places it for you; use it directly to put window controls
 * somewhere else. It sets `-webkit-app-region: no-drag`, because a control
 * inside a drag region never receives its click.
 *
 * Fully controlled like everything else here: it holds no window state, reads
 * `maximized` and `dirty` from you, and reports presses through the callbacks.
 * Outside Electron there is no window to act on — `useWindowState` from
 * `pretty-panels/electron` hands it no-ops, and the cluster renders inert.
 */
export function WindowControls({
  platform,
  maximized = false,
  dirty = false,
  graphite = false,
  inactive = false,
  onMinimize,
  onMaximize,
  onClose,
  className,
}: WindowControlsProps) {
  const os = platform ?? detectPlatform();

  const g = GLYPHS[os];
  const closeLabel = dirty ? 'Close — unsaved changes' : 'Close';
  const zoomLabel = maximized ? 'Restore' : 'Zoom';

  const buttons = {
    minimize: onMinimize && (
      <button
        key="minimize"
        type="button"
        className="pp-wc-btn pp-wc-minimize"
        onClick={onMinimize}
        aria-label="Minimize"
        title="Minimize"
      >
        {g.minimize}
      </button>
    ),
    maximize: onMaximize && (
      <button
        key="maximize"
        type="button"
        className="pp-wc-btn pp-wc-maximize"
        onClick={onMaximize}
        aria-label={zoomLabel}
        title={zoomLabel}
      >
        {maximized ? g.restore : g.maximize}
      </button>
    ),
    close: onClose && (
      <button
        key="close"
        type="button"
        className={`pp-wc-btn pp-wc-close${dirty ? ' is-dirty' : ''}`}
        onClick={onClose}
        // The dot is a `::after`, so what it means has to be said here or the
        // only visible sign of unsaved work would be invisible to a screen
        // reader. The label states what is true rather than what the button
        // does about it.
        aria-label={closeLabel}
        title={closeLabel}
      >
        {g.close}
      </button>
    ),
  };

  // `pp-no-drag` lifts the cluster out of the titlebar's drag region, and is
  // what TitleBar's double-click guard looks for.
  const cls = cx('pp-wc', 'pp-chrome', 'pp-no-drag', className);
  return (
    // An empty string rather than `true`: the stylesheet tests for the
    // attribute's presence, and `data-graphite="true"` would read as though
    // there were a false to write.
    <div
      className={cls}
      data-platform={os}
      data-graphite={graphite ? '' : undefined}
      data-inactive={inactive ? '' : undefined}
    >
      {ORDER[os].map((name) => buttons[name])}
    </div>
  );
}
