import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { type Platform, detectPlatform } from './platform';
import { cx } from './util';
import { WindowControls } from './WindowControls';

export interface TitleBarProps {
  /** Window title. A string is set in the kit's label face inside its own
   *  capsule; pass a node for custom markup. Omit it and no capsule is drawn —
   *  an empty pill would float there saying nothing. Ignored when `children`
   *  is given. */
  title?: ReactNode;
  /** Bar content in place of a title — a `Tabs` strip, a toolbar. Sits in the
   *  middle of the strip, unglazed and never a drag handle, so it can bring
   *  whatever surface it likes. */
  children?: ReactNode;
  /** Leading / trailing capsules, inboard of the window controls — a status
   *  readout, a format, a pair of actions. Both opt out of the drag region, and
   *  both fold into the overflow sheet when the window is too narrow to hold
   *  them. */
  left?: ReactNode;
  right?: ReactNode;
  /** Platform conventions — control placement and order. Auto-detected from the
   *  browser when omitted; pass what the preload bridge reports if you'd rather
   *  not trust the user agent. */
  platform?: Platform;
  /** `custom` draws the kit's own cluster (the default — the only option that
   *  works with `frame: false` on every platform). `native` draws none and
   *  reserves space for the OS buttons, for macOS `titleBarStyle: 'hidden'` or
   *  Electron's `titleBarOverlay`. `none` reserves nothing. */
  controls?: 'custom' | 'native' | 'none';
  /** Which end the controls sit at. Defaults to the platform convention: left
   *  on macOS, right on Windows and Linux. */
  controlsSide?: 'left' | 'right';
  /** Title placement. Leading by default — the capsules read as a row from the
   *  controls outward; `center` pins the title to the middle of the window
   *  instead, the way a native macOS title sits. */
  align?: 'start' | 'center';
  /** Window state, for the zoom glyph and for standing the strip down in
   *  fullscreen (where the OS owns the top of the screen). */
  maximized?: boolean;
  fullscreen?: boolean;
  /** Unsaved work — a dot in the close button. See `WindowControls`. */
  dirty?: boolean;
  /** Monochrome window controls instead of the macOS traffic lights. See
   *  `WindowControls`. `controls="custom"` only — the OS paints its own under
   *  `native`. */
  graphite?: boolean;
  /** Step the glass back to mark an unfocused window. The contents recede, and
   *  the macOS traffic lights lose their colour — the system's own two cues. */
  inactive?: boolean;
  /** Lay the strip out against `env(titlebar-area-*)` — the Window Controls
   *  Overlay geometry Electron publishes when the window uses `titleBarOverlay`
   *  (and installed PWAs get from the browser). Pair with `controls="native"`. */
  overlay?: boolean;
  /** Accessible name and tooltip for the overflow button, and for the sheet it
   *  opens. Worth setting in a localised app; the default is English. */
  overflowLabel?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  /** Double-click on the strip itself — the native zoom gesture. Presses inside
   *  a capsule don't count. */
  onTitleDoubleClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/* Three dots, drawn rather than typed: a `⋯` character sits on the text
   baseline and rides whatever the label face's dot spacing happens to be, which
   is not the same on every platform the strip renders on. */
const ELLIPSIS = (
  <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.5" />
    <circle cx="7" cy="2" r="1.5" />
    <circle cx="12" cy="2" r="1.5" />
  </svg>
);

/**
 * Whether the strip has run out of room for its own capsules.
 *
 * The slots deliberately don't shrink — a readout squeezed to `19…` reports
 * nothing — so when the row stops fitting it *overflows*, and that spill is the
 * measurement: `scrollWidth` past the strip's own box. The width the row wanted
 * is kept, and is the only number that puts the slots back, so the two states
 * can't chatter back and forth over a pixel of rounding.
 */
function useOutOfRoom(ref: RefObject<HTMLDivElement | null>) {
  const [tight, setTight] = useState(false);
  // Strip width the slots need laid out in full, captured the moment they stop
  // fitting. Zero until that has happened at least once.
  const need = useRef(0);

  // Held in a ref and refreshed on every render so the observer below can be
  // installed once and still read current state.
  const fit = useRef<() => void>(() => {});
  fit.current = () => {
    const el = ref.current;
    if (!el) return;
    const room = el.clientWidth;
    // Not laid out yet — a hidden tab, a first paint under `display: none`.
    // Zero width is no evidence, and collapsing on it would show the sheet
    // button as the strip's first frame.
    if (room === 0) return;
    if (tight) {
      if (need.current > 0 && room >= need.current) setTight(false);
    } else if (el.scrollWidth - room > 1) {
      // `scrollWidth` reaches the last capsule's right edge and stops — the
      // strip's trailing padding is past it, outside the box it unions. Adding
      // it back is what makes `need` the width the row would actually be happy
      // at, instead of one that collapses again the moment it is reached.
      need.current = el.scrollWidth + (parseFloat(getComputedStyle(el).paddingRight) || 0);
      setTight(true);
    }
  };

  // The slots' content can change width without the strip's box moving — a
  // readout going from `60` to `1920×1080` — so this runs after every render,
  // not only on resize. It has to be a layout effect: measuring in a passive one
  // paints a frame of the spilled row first.
  useLayoutEffect(() => {
    fit.current();
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return tight;
}

/**
 * The strip's slots folded into one button — an ellipsis capsule that opens them
 * as a sheet underneath. It takes the trailing capsule's place, so it lands at
 * the end of the strip, and inboard of the cluster when the cluster is there
 * too: the same spot the platform puts an overflow button at either end.
 */
function TitleBarOverflow({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const sheetId = useId();

  // Dismiss on a press anywhere else, or on Escape. Captured on the document so
  // a press on the app below closes the sheet rather than acting on the app
  // through it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="pp-titlebar-overflow pp-no-drag" ref={wrap}>
      <button
        type="button"
        className="pp-titlebar-more pp-chrome"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen((o) => !o)}
      >
        {ELLIPSIS}
      </button>
      {open && (
        <div
          id={sheetId}
          className="pp-titlebar-sheet pp-chrome"
          role="group"
          aria-label={label}
          /* Pressing a control in the sheet is the user finishing with it — the
             menu idiom, and it keeps an action from leaving a stale sheet
             hanging over the app. A readout has nothing to press, so a sheet of
             those stays put until it is dismissed. */
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, a, [role="button"]')) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * The chrome across the top of a frameless desktop window: window controls, a
 * title and slots of your own, as frosted capsules floating over the app.
 *
 * It is an **overlay, not a row**. The strip is `position: absolute` and
 * reserves nothing, so the window runs full-bleed to its own top edge and the
 * capsules sit over whatever is there, blurring it. That is what makes the
 * material worth having — glass over a flat reserved band is just a bar with
 * extra steps. Anything that must clear the capsules can read their strip
 * height off `--titlebar-h`.
 *
 * The strip is the drag region; every capsule opts back out, because a control
 * inside a drag region never receives its click. That is the one rule this
 * component exists to get right.
 *
 * **It never spills.** Narrow the window past the point where the capsules fit
 * and `left` / `right` fold into a single ellipsis button at the trailing end,
 * opening as a sheet under the strip. The window controls are pointedly not part
 * of that: they keep their platform side and are the one thing that never
 * collapses, because a window you can't close is worse than a readout you can't
 * see.
 *
 * It renders only the chrome. The window state behind `maximized` /
 * `fullscreen`, and the callbacks that act on the window, are the host app's —
 * wire them with `useWindowState()` from `pretty-panels/electron`, or by hand
 * over your own IPC. In a plain browser the callbacks simply do nothing.
 */
export function TitleBar({
  title,
  children,
  left,
  right,
  platform,
  controls = 'custom',
  controlsSide,
  align = 'start',
  maximized = false,
  fullscreen = false,
  dirty = false,
  graphite = false,
  inactive = false,
  overlay = false,
  overflowLabel = 'More',
  onMinimize,
  onMaximize,
  onClose,
  onTitleDoubleClick,
  className,
  style,
}: TitleBarProps) {
  const os = platform ?? detectPlatform();
  const side = controlsSide ?? (os === 'mac' ? 'left' : 'right');

  const strip = useRef<HTMLDivElement>(null);
  // Only a strip with something to fold away can be collapsed. Without the
  // slots there is nothing the ellipsis would hold, and a button that opens an
  // empty sheet is worse than a title that ellipsizes.
  const collapsed = useOutOfRoom(strip) && (left != null || right != null);

  // Fullscreen hands the top of the screen back to the OS: there is no frame to
  // minimize, zoom or close from, and on macOS the system's own bar slides down
  // over ours. So the cluster goes away — and with it the space `native` was
  // holding for the traffic lights.
  const mode = fullscreen ? 'none' : controls;

  const cluster =
    mode === 'custom' ? (
      <WindowControls
        platform={os}
        maximized={maximized}
        dirty={dirty}
        graphite={graphite}
        inactive={inactive}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    ) : mode === 'native' ? (
      // Nothing to draw — the OS paints its buttons over this space. The width
      // comes from --titlebar-inset so it can be matched to whatever
      // `trafficLightPosition` the window was given.
      <div className="pp-titlebar-inset" aria-hidden="true" />
    ) : null;

  /* A double-click on the strip's own ground is the zoom gesture; one on a
     capsule belongs to whatever is in it. The capsules are the no-drag regions,
     so the same lookup that decides dragging decides this. */
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onTitleDoubleClick) return;
    if ((e.target as HTMLElement).closest('.pp-no-drag')) return;
    onTitleDoubleClick();
  };

  const cls = cx('pp-titlebar', className);
  return (
    <div
      ref={strip}
      className={cls}
      style={style}
      data-platform={os}
      data-align={align}
      data-controls={mode}
      data-side={side}
      data-overlay={overlay ? '' : undefined}
      data-inactive={inactive ? '' : undefined}
      data-collapsed={collapsed ? '' : undefined}
      onDoubleClick={onDoubleClick}
    >
      {side === 'left' && cluster}
      {!collapsed && left != null && (
        <div className="pp-titlebar-slot pp-titlebar-lead pp-chrome pp-no-drag">{left}</div>
      )}
      {children != null ? (
        <div className="pp-titlebar-content pp-no-drag">{children}</div>
      ) : (
        title != null && (
          /* Deliberately still part of the drag region: the title is the
             window's handle on every platform, and a no-drag pill there would
             be a dead patch in the middle of the strip. */
          <div className="pp-titlebar-title pp-chrome">
            {typeof title === 'string' ? <span>{title}</span> : title}
          </div>
        )
      )}
      {!collapsed && right != null && (
        <div className="pp-titlebar-slot pp-titlebar-trail pp-chrome pp-no-drag">{right}</div>
      )}
      {collapsed && (
        <TitleBarOverflow label={overflowLabel}>
          {left}
          {right}
        </TitleBarOverflow>
      )}
      {side === 'right' && cluster}
    </div>
  );
}
