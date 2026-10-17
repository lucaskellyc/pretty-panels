import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { Easing, Keyframe } from './anim';
import { FONT_GROUP, groupsFor, laneLabel, type AnimProp, type Group, type GroupId } from './channels';
import { GraphEditor, type GraphLane } from './GraphEditor';
import { ChevronDownIcon, LockIcon, LoopIcon, PauseIcon, PlayIcon, SkipEndIcon, SkipStartIcon } from './icons';
import { clampWindow, FULL_VIEW, rulerTicks } from './ruler';
import {
  anim,
  clock,
  DURATION,
  FPS,
  goEnd,
  goStart,
  moveKey,
  moveKeyTo,
  removeKey,
  seek,
  setCurve,
  setLoop,
  setWork,
  toggle,
  toggleLocked,
  toggleMuted,
  transport,
} from './state';
import { frameAt, frameCount, snapToFrame, timecode } from './timecode';

/** How close (px) the pointer has to be to grab a work-area edge. */
const GRAB_PX = 7;
/** Horizontal travel that turns a press on a key into a retime. */
const RETIME_PX = 3;
/** Vertical px per frame when scrubbing the timecode readout. */
const PX_PER_FRAME = 3;
// Seeker zoom: e-folds per px of pinch, per-event cap, and line-mode wheel px.
const ZOOM_SPEED = 0.01;
const ZOOM_STEP_CAP = 24;
const LINE_PX = 16;

/** The DS timeline is driven by --t / --in / --out fractions set inline. */
const vars = (v: Record<string, number>): CSSProperties => v as CSSProperties;

type Drag = 'scrub' | 'in' | 'out' | null;

/** What Delete acts on: a merged group mark (`prop: null`) or one channel's key. */
interface Selection {
  group: GroupId;
  prop: AnimProp | null;
  t: number;
}

/** A key retime in flight, measured from where it was picked up. */
interface KeyGrab {
  group: GroupId;
  prop: AnimProp | null;
  t0: number;
  t: number;
  x0: number;
  moved: boolean;
}

/** One mark on a group's merged lane: every channel keyed at this instant. */
interface LaneKey {
  t: number;
  ease: Easing;
  props: AnimProp[];
}

function laneKeys(group: Group, tracks: Partial<Record<AnimProp, Keyframe[]>>): LaneKey[] {
  const byTime = new Map<number, LaneKey>();
  for (const prop of group.props) {
    for (const key of tracks[prop] ?? []) {
      const mark = byTime.get(key.t);
      if (mark) mark.props.push(prop);
      else byTime.set(key.t, { t: key.t, ease: key.ease ?? 'linear', props: [prop] });
    }
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

/* ---- Time-driven pieces ---------------------------------------------------
   The only parts of the dock that change every frame during playback. Each
   subscribes to the playhead itself, so the lanes, names and graph re-render
   on edits and view changes only — never per frame.
   ------------------------------------------------------------------------- */

function PlayButton() {
  const playing = transport.useSelect((s) => s.playing);
  return (
    <button className="tl-btn" aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} title="Play / pause (Space)" onClick={toggle}>
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

function Playhead({ viewIn, span }: { viewIn: number; span: number }) {
  const time = transport.useSelect((s) => s.time);
  return (
    <div className="tl-playhead" style={vars({ '--t': (time - viewIn) / span })}>
      <span className="tl-head" />
    </div>
  );
}

/** fps · frame/total, and the timecode — which doubles as a vertical scrub control. */
function Readout() {
  const time = transport.useSelect((s) => s.time);
  const grab = useRef<{ t0: number; y0: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const end = () => {
    grab.current = null;
    setScrubbing(false);
  };
  return (
    <div className="tl-readout">
      <span className="tl-meta">
        {FPS} fps · {frameAt(time, FPS)}/{frameCount(DURATION, FPS)}
      </span>
      <span
        className={`tl-time${scrubbing ? ' is-scrubbing' : ''}`}
        title="Drag up or down to scrub"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          grab.current = { t0: clock.time, y0: e.clientY };
          setScrubbing(true);
        }}
        onPointerMove={(e) => {
          const g = grab.current;
          if (!g) return;
          if (e.buttons === 0) return end();
          // Measured from the grab, so reversing lands back on the start frame.
          seek(g.t0 + (g.y0 - e.clientY) / PX_PER_FRAME / FPS);
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {timecode(time, FPS)}
      </span>
    </div>
  );
}

/* ---- The timeline -------------------------------------------------------- */

/**
 * The timeline / seeker, ported from motion-studio (itself the woodshop design
 * system's `.tl`, re-expressed in React over the clock). Each group of scene
 * settings gets one merged lane; its twisty opens a lane per keyed channel. The
 * whole canvas scrubs, except near the work area's dashed edges (which drag)
 * and on keys (which drag to retime). Graph mode swaps the lanes for the value
 * graph of the selected group's channels.
 */
function Timeline({
  selected: selectedChar,
  collapsed,
  onToggleCollapsed,
  tools,
  bodyRef,
}: {
  /** The glyph selected on the stage: its group is listed even unanimated. */
  selected: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Extra buttons for the bar (record, still). */
  tools?: ReactNode;
  bodyRef: React.Ref<HTMLDivElement>;
}) {
  const { doc, muted, locked } = anim.use();
  const loop = transport.useSelect((s) => s.loop);
  const work = transport.useSelect((s) => s.work);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>(null);
  const [edgeDrag, setEdgeDrag] = useState(false);
  const [overEdge, setOverEdge] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<GroupId>>(() => new Set());
  const keyGrab = useRef<KeyGrab | null>(null);
  const [retiming, setRetiming] = useState(false);
  const [graph, setGraph] = useState(false);
  const [graphGroup, setGraphGroup] = useState<GroupId>(FONT_GROUP.id);
  const [focusProp, setFocusProp] = useState<AnimProp | null>(null);

  // The visible window, as fractions of the duration.
  const [view, setView] = useState(FULL_VIEW);
  const viewIn = view.in * DURATION;
  const viewOut = view.out * DURATION;
  const span = Math.max(1e-6, viewOut - viewIn);
  const frac = (t: number) => (t - viewIn) / span;
  const timeAt = (f: number) => viewIn + f * span;
  const zoomed = view.in > 0 || view.out < 1;
  const ticks = useMemo(() => rulerTicks(viewIn, viewOut, DURATION), [viewIn, viewOut]);

  const groups = useMemo(() => groupsFor(doc.tracks, selectedChar), [doc.tracks, selectedChar]);
  const lanes = useMemo(
    () =>
      groups.map((group) => ({
        group,
        keys: laneKeys(group, doc.tracks),
        props: group.props
          .filter((p) => doc.tracks[p])
          .map((p) => ({ prop: p, label: laneLabel(p), keys: doc.tracks[p]! })),
      })),
    [groups, doc.tracks],
  );

  const graphLanes: GraphLane[] = useMemo(
    () => lanes.find((l) => l.group.id === graphGroup)?.props ?? [],
    [lanes, graphGroup],
  );

  /** The canvas's content box — the span the window is laid out across. */
  const metrics = (): { left: number; width: number } | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const width = rect.width - padL - (parseFloat(cs.paddingRight) || 0);
    return width > 0 ? { left: rect.left + padL, width } : null;
  };

  const timeFromClientX = (clientX: number): number => {
    const m = metrics();
    if (!m) return clock.time;
    return timeAt(Math.max(0, Math.min(1, (clientX - m.left) / m.width)));
  };

  const edgeAt = (clientX: number): Exclude<Drag, 'scrub'> => {
    const m = metrics();
    if (!m) return null;
    const x = clientX - m.left;
    const dIn = Math.abs(x - frac(work.in) * m.width);
    const dOut = Math.abs(x - frac(work.out) * m.width);
    if (dIn <= GRAB_PX && dIn <= dOut) return 'in';
    if (dOut <= GRAB_PX) return 'out';
    return null;
  };

  /* ---- Scrubbing + work area (under pointer capture) ---- */

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const edge = edgeAt(e.clientX);
    if (edge) {
      drag.current = edge;
      setEdgeDrag(true);
      return;
    }
    drag.current = 'scrub';
    setSelected(null);
    seek(timeFromClientX(e.clientX));
  };

  const endDrag = () => {
    drag.current = null;
    setEdgeDrag(false);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) {
      setOverEdge(!keyGrab.current && edgeAt(e.clientX) !== null);
      return;
    }
    if (e.buttons === 0) return endDrag();
    const t = timeFromClientX(e.clientX);
    if (drag.current === 'scrub') return seek(t);
    // The work area never collapses: at least a frame between the marks.
    const gap = 1 / FPS;
    const snapped = snapToFrame(t, FPS);
    if (drag.current === 'in') setWork({ in: Math.min(snapped, work.out - gap), out: work.out });
    else setWork({ in: work.in, out: Math.max(snapped, work.in + gap) });
  };

  /* ---- Zoom + pan the seeker: pinch / ⌘-scroll zooms about the pointer, two
     fingers pan, double-click fits. Native + non-passive so it can
     preventDefault (React's onWheel is passive). ---- */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const zooming = e.ctrlKey || e.metaKey;
      const unit = e.deltaMode === 1 ? LINE_PX : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      // A plain vertical wheel scrolls the lane list.
      if (!zooming && Math.abs(dy) >= Math.abs(dx)) return;
      const m = metrics();
      if (!m) return;
      e.preventDefault();
      const { left, width } = m;
      const { clientX } = e;
      setView((v) => {
        const inSec = v.in * DURATION;
        const outSec = v.out * DURATION;
        const seen = Math.max(1e-6, outSec - inSec);
        if (!zooming) {
          const dt = (dx / width) * seen;
          return clampWindow(inSec + dt, outSec + dt, DURATION, FPS);
        }
        const at = Math.max(0, Math.min(1, (clientX - left) / width));
        const anchor = inSec + at * seen;
        const stepd = Math.max(-ZOOM_STEP_CAP, Math.min(ZOOM_STEP_CAP, dy));
        const next = seen * Math.exp(stepd * ZOOM_SPEED);
        return clampWindow(anchor - at * next, anchor - at * next + next, DURATION, FPS);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ---- Retiming keys ---- */

  const startKeyDrag = (e: PointerEvent<HTMLSpanElement>, group: GroupId, prop: AnimProp | null, t: number) => {
    e.stopPropagation(); // not a scrub
    if (e.button !== 0) return;
    e.preventDefault();
    seek(t); // the playhead parks on the key either way
    if (locked.includes(group)) return;
    setSelected({ group, prop, t });
    keyGrab.current = { group, prop, t0: t, t, x0: e.clientX, moved: false };
    setRetiming(true);
  };

  // On the window rather than under capture: a retime re-keys the diamond, so
  // React replaces the element (and any capture it held) mid-gesture.
  useEffect(() => {
    if (!retiming) return;
    const end = () => {
      keyGrab.current = null;
      setRetiming(false);
    };
    const cancel = () => {
      const g = keyGrab.current;
      end();
      if (!g?.moved || g.t === g.t0) return;
      moveKey(g.group, g.prop, g.t, g.t0);
      setSelected({ group: g.group, prop: g.prop, t: g.t0 });
      seek(g.t0);
    };
    const onMove = (e: globalThis.PointerEvent) => {
      const g = keyGrab.current;
      if (!g) return;
      if (e.buttons === 0) return end();
      const m = metrics();
      if (!m) return;
      const dx = e.clientX - g.x0;
      if (!g.moved) {
        if (Math.abs(dx) < RETIME_PX) return; // still a click that selects
        g.moved = true;
      }
      const t = snapToFrame(Math.max(0, Math.min(DURATION, g.t0 + (dx / m.width) * span)), FPS);
      if (frameAt(t, FPS) === frameAt(g.t, FPS)) return;
      moveKey(g.group, g.prop, g.t, t);
      g.t = t;
      setSelected({ group: g.group, prop: g.prop, t });
      seek(t);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      cancel();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [retiming, span]);

  /* ---- Selection + delete ---- */

  const toggleExpanded = (id: GroupId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
    setSelected((s) => (s?.group === id && s.prop !== null ? null : s));
  };

  // The selection resolved against the doc, so a delete or emptied track drops it.
  const selectionLive = useMemo(() => {
    if (!selected) return false;
    const lane = lanes.find((l) => l.group.id === selected.group);
    if (!lane) return false;
    if (selected.prop === null) return lane.keys.some((k) => k.t === selected.t);
    return lane.props.some((p) => p.prop === selected.prop && p.keys.some((k) => k.t === selected.t));
  }, [lanes, selected]);

  const isSelected = (group: GroupId, prop: AnimProp | null, t: number) =>
    selected !== null && selected.group === group && selected.prop === prop && selected.t === t;

  // Capture phase, so a selected key claims Delete/Backspace before anything else.
  useEffect(() => {
    if (!selected || !selectionLive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      e.preventDefault();
      removeKey(selected.group, selected.prop, selected.t);
      setSelected(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selected, selectionLive]);

  const keyMark = (group: GroupId, prop: AnimProp | null, t: number, ease: Easing, title: string) => (
    <span
      key={t}
      className="tl-key"
      data-ease={ease}
      aria-selected={isSelected(group, prop, t)}
      title={title}
      style={vars({ '--t': frac(t) })}
      onPointerDown={(e) => startKeyDrag(e, group, prop, t)}
    />
  );

  const focus = focusProp && graphLanes.some((l) => l.prop === focusProp) ? focusProp : (graphLanes[0]?.prop ?? null);

  return (
    <div className={`tl${retiming ? ' is-retiming' : ''}`}>
      <div className="tl-bar">
        <div className="tl-bar-side">
          <div className="tl-transport">
            <button className="tl-btn" aria-label="Go to start" title="Go to start" onClick={goStart}>
              <SkipStartIcon />
            </button>
            <PlayButton />
            <button className="tl-btn" aria-label="Go to end" title="Go to end" onClick={goEnd}>
              <SkipEndIcon />
            </button>
          </div>
          <button className="tl-btn tl-chip" aria-pressed={loop} aria-label="Loop the work area" title="Loop the work area" onClick={() => setLoop(!loop)}>
            <LoopIcon />
          </button>
          <button
            className="tl-btn tl-chip"
            aria-pressed={graph}
            title={graph ? 'Show keyframe lanes' : 'Show the value graph'}
            onClick={() => setGraph((v) => !v)}
          >
            Graph
          </button>
          {tools}
        </div>

        <div className="tl-bar-side is-end">
          <Readout />
          <button
            className="tl-btn tl-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
            title={collapsed ? 'Expand timeline' : 'Collapse timeline'}
            onClick={onToggleCollapsed}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      <div className="tl-body" ref={bodyRef}>
        {graph ? (
          <div className="tl-names tl-graph-names">
            {groups.map((g) => (
              <button
                key={g.id}
                className={`tl-name tl-graph-group${graphGroup === g.id ? ' is-selected' : ''}`}
                aria-pressed={graphGroup === g.id}
                onClick={() => setGraphGroup(g.id)}
              >
                {g.name}
              </button>
            ))}
            {graphLanes.map(({ prop, label }, i) => (
              <button
                key={prop}
                className={`tl-name tl-graph-name${focus === prop ? ' is-selected' : ''}`}
                aria-pressed={focus === prop}
                title={`Shape ${label}`}
                onClick={() => setFocusProp(prop)}
              >
                <span className="tl-graph-swatch" style={vars({ '--n': i })} />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="tl-names">
            {lanes.map(({ group, props }) => {
              const open = expanded.has(group.id) && props.length > 0;
              const isMuted = muted.includes(group.id);
              const isLocked = locked.includes(group.id);
              return (
                <div key={group.id} className="tl-group">
                  <div className={`tl-name${isMuted ? ' is-off' : ''}${isLocked ? ' is-locked' : ''}${graphGroup === group.id ? ' is-selected' : ''}`}>
                    <button
                      className="tl-twisty"
                      aria-expanded={open}
                      disabled={props.length === 0}
                      aria-label={open ? 'Hide channels' : 'Show channels'}
                      title={props.length === 0 ? 'No keyed channels' : open ? 'Hide channels' : 'Show channels'}
                      onClick={() => toggleExpanded(group.id)}
                    >
                      <ChevronDownIcon size={11} />
                    </button>
                    <button
                      className="tl-dot"
                      aria-pressed={!isMuted}
                      aria-label={isMuted ? `Enable ${group.name} animation` : `Mute ${group.name} animation`}
                      title={isMuted ? 'Muted — the stage uses the static values' : 'Mute this group’s animation'}
                      onClick={() => toggleMuted(group.id)}
                    />
                    <button
                      className={`tl-lock${isLocked ? ' is-on' : ''}`}
                      aria-pressed={isLocked}
                      aria-label={isLocked ? `Unlock ${group.name}` : `Lock ${group.name}`}
                      title={isLocked ? `${group.name} is locked — its keys take no edits` : `Lock ${group.name}`}
                      onClick={() => toggleLocked(group.id)}
                    >
                      <LockIcon open={!isLocked} />
                    </button>
                    <button className="tl-label" title={`Select ${group.name} for the graph`} onClick={() => setGraphGroup(group.id)}>
                      {group.name}
                    </button>
                  </div>
                  <div className={`collapsible tl-props${open ? '' : ' is-collapsed'}`}>
                    <div className="collapsible-clip">
                      {props.map(({ prop, label }) => (
                        <div key={prop} className="tl-prop-name">
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`tl-canvas${overEdge ? ' is-over-edge' : ''}${graph ? ' is-graph' : ''}`}
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setOverEdge(false)}
          onDoubleClick={() => setView(FULL_VIEW)}
          role="slider"
          aria-label="Playhead"
          aria-valuemin={0}
          aria-valuemax={DURATION}
        >
          <div className="tl-ruler">
            {ticks.map(({ t, major, label }) => (
              <span key={t} className={`tl-tick${major ? ' is-major' : ''}`} style={vars({ '--t': frac(t) })}>
                {major && frac(t) < 0.985 && <i>{label}</i>}
              </span>
            ))}
          </div>

          {graph ? (
            <GraphEditor
              lanes={graphLanes}
              focus={focus}
              viewIn={viewIn}
              viewOut={viewOut}
              frac={frac}
              timeAt={timeAt}
              fps={FPS}
              duration={DURATION}
              onSetCurve={setCurve}
              onMoveKeyTo={moveKeyTo}
              onSelectKey={(prop, t) => {
                setFocusProp(prop);
                setSelected({ group: graphGroup, prop, t });
                seek(t);
              }}
              selected={selected && selected.group === graphGroup ? { prop: selected.prop, t: selected.t } : null}
            />
          ) : (
            <div className="tl-lanes">
              {lanes.map(({ group, keys, props }) => {
                const open = expanded.has(group.id) && props.length > 0;
                const off = muted.includes(group.id) ? ' is-off' : '';
                return (
                  <div key={group.id} className="tl-lane-group">
                    <div className={`tl-lane${off}`}>
                      {keys.map((key) =>
                        keyMark(
                          group.id,
                          null,
                          key.t,
                          key.ease,
                          `${group.name} · ${key.props.map(laneLabel).join(', ')} · ${timecode(key.t, FPS)}`,
                        ),
                      )}
                    </div>
                    <div className={`collapsible tl-prop-lanes${open ? '' : ' is-collapsed'}`}>
                      <div className="collapsible-clip">
                        {props.map(({ prop, label, keys: propKeys }) => (
                          <div key={prop} className={`tl-prop-lane${off}`}>
                            {propKeys.map((key) =>
                              keyMark(group.id, prop, key.t, key.ease ?? 'linear', `${label} · ${timecode(key.t, FPS)}`),
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`tl-range${edgeDrag ? ' is-dragging' : ''}`} style={vars({ '--in': frac(work.in), '--out': frac(work.out) })} />
          <Playhead viewIn={viewIn} span={span} />
          {zoomed && (
            <div className="tl-zoom" title="Double-click the seeker to fit">
              {(DURATION / span).toFixed(1)}×
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- The dock ------------------------------------------------------------ */

const MIN_BODY = 48;
const MIN_STAGE = 220;
const FOLD_TIMEOUT_MS = 600;

/**
 * The full-width dock along the bottom: the timeline, a grip on its top edge
 * that sizes the lane area (double-click to fit), and a fold down to just the
 * transport bar. The stage above measures its own box and refits either way.
 */
export function TimelineDock({ selected, tools }: { selected: string | null; tools?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [folding, setFolding] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [bodyH, setBodyH] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const grab = useRef<{ y0: number; h0: number; max: number } | null>(null);
  const foldTimer = useRef(0);

  const toggleCollapsed = () => {
    setCollapsed((v) => !v);
    // `is-folding` keeps the body's scrollbar off while its height animates.
    setFolding(true);
    window.clearTimeout(foldTimer.current);
    foldTimer.current = window.setTimeout(() => setFolding(false), FOLD_TIMEOUT_MS);
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const done = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === 'height') setFolding(false);
    };
    el.addEventListener('transitionend', done);
    return () => {
      el.removeEventListener('transitionend', done);
      window.clearTimeout(foldTimer.current);
    };
  }, []);

  const endResize = () => {
    grab.current = null;
    setResizing(false);
  };

  return (
    <div
      ref={dockRef}
      className={`dock-tl${collapsed ? ' is-collapsed' : ''}${resizing ? ' is-resizing' : ''}${folding ? ' is-folding' : ''}`}
      style={bodyH === null ? undefined : ({ '--tl-body-h': `${bodyH}px` } as CSSProperties)}
    >
      <div
        className="dock-tl-grip"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        title="Drag to resize · double-click to fit"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const h0 = bodyRef.current?.offsetHeight ?? 0;
          const chrome = (dockRef.current?.offsetHeight ?? h0) - h0;
          grab.current = { y0: e.clientY, h0, max: Math.max(MIN_BODY, window.innerHeight - MIN_STAGE - chrome) };
          setResizing(true);
        }}
        onPointerMove={(e) => {
          const g = grab.current;
          if (!g) return;
          if (e.buttons === 0) return endResize();
          setBodyH(Math.max(MIN_BODY, Math.min(g.max, g.h0 + (g.y0 - e.clientY))));
        }}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={() => setBodyH(null)}
      />
      <Timeline selected={selected} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} tools={tools} bodyRef={bodyRef} />
    </div>
  );
}
