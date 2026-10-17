import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { OVERSHOOT_OF, OVERSHOOTS, type Curve, type Keyframe } from './anim';
import type { AnimProp } from './channels';
import {
  curveFromHandle,
  denorm,
  handlesOf,
  isShaped,
  laneRange,
  norm,
  overshootOf,
  trackPoints,
  type GraphPoint,
  type Range,
} from './graph';
import { frameAt, snapToFrame } from './timecode';

/** The DS timeline's idiom: positions are fractions set inline. */
const vars = (v: Record<string, number>): CSSProperties => v as CSSProperties;

/** The viewBox the curves are drawn in; stretched to the box, strokes held at
 *  one pixel by `vector-effect`. */
const VB = 1000;
/** Samples across the visible window per curve. */
const STEPS = 160;
/** Travel that turns a press on a key or handle into a drag. */
const DRAG_PX = 2;

export interface GraphLane {
  prop: AnimProp;
  label: string;
  keys: Keyframe[];
}

/** A drag in flight. `t` follows the key as it's retimed; `t0`/`v0`/`curve0`
 *  are what Escape puts back. */
interface Grab {
  prop: AnimProp;
  t: number;
  which: 'key' | 'out' | 'in';
  x0: number;
  y0: number;
  moved: boolean;
  t0: number;
  v0: number;
  curve0: Curve | undefined;
}

export interface GraphEditorProps {
  lanes: GraphLane[];
  /** Which lane carries the keys and handles. The others draw as context. */
  focus: AnimProp | null;
  viewIn: number;
  viewOut: number;
  /** Time → 0..1 across the box and back: the seeker's, so the graph and the
   *  lanes agree about where a moment is. */
  frac: (t: number) => number;
  timeAt: (f: number) => number;
  fps: number;
  duration: number;
  onSetCurve: (prop: AnimProp, t: number, curve: Curve | null) => void;
  onMoveKeyTo: (prop: AnimProp, from: number, to: number, v: number) => void;
  /** Focus this key; the caller seeks to it as well. */
  onSelectKey: (prop: AnimProp, t: number) => void;
  selected: { prop: AnimProp | null; t: number } | null;
}

/**
 * The value graph: what a channel does between its keys, and the bezier
 * handles that shape it. Each lane is normalised to its own range (an angle in
 * degrees and an intensity in hundredths can't share an axis), so only the
 * focused lane is editable and its numbers are the ones printed. A key drags in
 * both time and value here — one edit per pointer move (`moveKeyTo`).
 */
export function GraphEditor({
  lanes,
  focus,
  viewIn,
  viewOut,
  frac,
  timeAt,
  fps,
  duration,
  onSetCurve,
  onMoveKeyTo,
  onSelectKey,
  selected,
}: GraphEditorProps) {
  const box = useRef<HTMLDivElement>(null);
  const grab = useRef<Grab | null>(null);
  const [dragging, setDragging] = useState(false);

  const active = lanes.find((lane) => lane.prop === focus) ?? lanes[0] ?? null;

  const pointAt = (clientX: number, clientY: number, range: Range): GraphPoint | null => {
    const m = box.current?.getBoundingClientRect();
    if (!m || m.width === 0 || m.height === 0) return null;
    return {
      t: timeAt((clientX - m.left) / m.width),
      // 0 is the bottom of the box, so the vertical axis flips against the screen's.
      v: denorm(range, 1 - (clientY - m.top) / m.height),
    };
  };

  const start = (e: PointerEvent, prop: AnimProp, key: Keyframe, which: Grab['which']) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // the canvas underneath reads a press as a scrub
    e.preventDefault();
    onSelectKey(prop, key.t);
    grab.current = { prop, t: key.t, which, x0: e.clientX, y0: e.clientY, moved: false, t0: key.t, v0: key.v, curve0: key.curve };
    setDragging(true);
  };

  // The drag lives on the window rather than under pointer capture: editing a
  // key re-keys it in its list, so React swaps the element out mid-gesture and
  // takes any capture with it.
  useEffect(() => {
    if (!dragging) return;
    const end = () => {
      grab.current = null;
      setDragging(false);
    };
    const cancel = () => {
      const g = grab.current;
      end();
      if (!g?.moved) return;
      if (g.which === 'key') {
        onMoveKeyTo(g.prop, g.t, g.t0, g.v0);
        onSelectKey(g.prop, g.t0);
      } else {
        onSetCurve(g.prop, g.t, g.curve0 ?? null);
      }
    };
    const onMove = (e: globalThis.PointerEvent) => {
      const g = grab.current;
      if (!g) return;
      if (e.buttons === 0) return end(); // a missed up-event
      if (!g.moved) {
        if (Math.abs(e.clientX - g.x0) < DRAG_PX && Math.abs(e.clientY - g.y0) < DRAG_PX) return;
        g.moved = true;
      }
      const lane = lanes.find((l) => l.prop === g.prop);
      if (!lane) return;
      const point = pointAt(e.clientX, e.clientY, laneRange(lane.keys));
      if (!point) return;

      if (g.which === 'key') {
        const t = snapToFrame(Math.max(0, Math.min(duration, point.t)), fps);
        onMoveKeyTo(g.prop, g.t, t, point.v);
        if (frameAt(t, fps) !== frameAt(g.t, fps)) onSelectKey(g.prop, t);
        g.t = t;
        return;
      }
      const at = lane.keys.findIndex((k) => k.t === g.t);
      const a = lane.keys[at];
      const b = lane.keys[at + 1];
      if (a && b) onSetCurve(g.prop, g.t, curveFromHandle(a, b, g.which, point));
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
  }, [dragging, duration, fps, lanes, onMoveKeyTo, onSelectKey, onSetCurve, timeAt]);

  if (lanes.length === 0) {
    return (
      <div className="tl-graph is-empty" ref={box}>
        <span>Arm a setting's stopwatch to shape its curve here.</span>
      </div>
    );
  }

  const polyline = (keys: Keyframe[], range: Range): string =>
    trackPoints(keys, viewIn, viewOut, STEPS)
      .map((p) => `${(frac(p.t) * VB).toFixed(1)},${((1 - norm(range, p.v)) * VB).toFixed(1)}`)
      .join(' ');

  const activeRange = active ? laneRange(active.keys) : { lo: 0, hi: 1 };
  const place = (p: GraphPoint) => ({ '--x': frac(p.t), '--y': 1 - norm(activeRange, p.v) });

  // The selected key of the focused lane, matched on the frame (half-frame
  // slack), when it has a segment leaving it for the overshoot chips to shape.
  const chosenAt =
    active && selected?.prop === active.prop
      ? active.keys.findIndex((k) => Math.abs(selected.t - k.t) < 0.5 / fps)
      : -1;
  const segment =
    active && chosenAt >= 0 && active.keys[chosenAt + 1]
      ? { prop: active.prop, t: active.keys[chosenAt].t, key: active.keys[chosenAt] }
      : null;
  const overshoot = segment ? overshootOf(segment.key) : null;

  return (
    <div className={`tl-graph${dragging ? ' is-dragging' : ''}`} ref={box}>
      <svg className="tl-graph-lines" viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="none">
        {lanes.map((lane) =>
          lane.prop === active?.prop ? null : (
            <polyline key={lane.prop} className="tl-graph-line" points={polyline(lane.keys, laneRange(lane.keys))} />
          ),
        )}
        {active && <polyline className="tl-graph-line is-active" points={polyline(active.keys, activeRange)} />}
        {/* Handle stems, under the knobs. */}
        {active?.keys.map((key, n) => {
          const next = active.keys[n + 1];
          if (!next) return null;
          const h = handlesOf(key, next);
          const line = (p: GraphPoint, anchor: Keyframe) => ({
            x1: (frac(anchor.t) * VB).toFixed(1),
            y1: ((1 - norm(activeRange, anchor.v)) * VB).toFixed(1),
            x2: (frac(p.t) * VB).toFixed(1),
            y2: ((1 - norm(activeRange, p.v)) * VB).toFixed(1),
          });
          return (
            <g key={key.t} className="tl-graph-stems">
              <line {...line(h.out, key)} />
              <line {...line(h.in, next)} />
            </g>
          );
        })}
      </svg>

      {/* Keys and handles are positioned elements, not SVG, so they keep their
          shape and hit area whatever the box's aspect ratio. */}
      {active?.keys.map((key, n) => {
        const next = active.keys[n + 1];
        const h = next ? handlesOf(key, next) : null;
        const chosen = selected?.prop === active.prop && Math.abs(selected.t - key.t) < 0.5 / fps;
        return (
          <div key={key.t} className="tl-graph-key-group">
            <span
              className={`tl-graph-key${isShaped(key) ? ' is-shaped' : ''}`}
              aria-selected={chosen}
              title={`${active.label} · ${key.v.toFixed(2)} — drag to retime and revalue`}
              style={vars(place({ t: key.t, v: key.v }))}
              onPointerDown={(e) => start(e, active.prop, key, 'key')}
            />
            {h && (
              <>
                <span
                  className="tl-graph-handle"
                  title="Drag to shape the curve leaving this key"
                  style={vars(place(h.out))}
                  onPointerDown={(e) => start(e, active.prop, key, 'out')}
                />
                <span
                  className="tl-graph-handle"
                  title="Drag to shape the curve arriving at the next key"
                  style={vars(place(h.in))}
                  onPointerDown={(e) => start(e, active.prop, key, 'in')}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Overshoot presets for the selected key's outgoing segment. */}
      {segment && (
        <div className="tl-graph-ease" role="radiogroup" aria-label="Overshoot" onPointerDown={(e) => e.stopPropagation()}>
          <div className="tl-seg">
            <button
              type="button"
              className="tl-btn"
              role="radio"
              aria-checked={overshoot === null}
              title="No overshoot — back to this key's own easing"
              onClick={() => onSetCurve(segment.prop, segment.t, null)}
            >
              None
            </button>
            {OVERSHOOTS.map((o) => (
              <button
                key={o.id}
                type="button"
                className="tl-btn"
                role="radio"
                aria-checked={overshoot === o.id}
                title={o.hint}
                onClick={() => onSetCurve(segment.prop, segment.t, OVERSHOOT_OF[o.id])}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The focused lane's own numbers — every lane has its own range. */}
      {active && (
        <div className="tl-graph-axis">
          <span>{activeRange.hi.toFixed(2)}</span>
          <span>{activeRange.lo.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
