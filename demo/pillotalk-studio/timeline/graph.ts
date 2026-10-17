/**
 * The graph editor's arithmetic.
 *
 * A value graph is two conversions and a curve: a track's values fitted into the
 * box that draws them, and a keyframe's bezier handles turned into points you
 * can take hold of — and back again once one has been dragged.
 *
 * Kept out of the component for the reason `ruler.ts` is kept out of
 * `Timeline.tsx`: it is pure, it is the part worth reasoning about on its own,
 * and a module that exports React components must export only components.
 */
import { CURVE_OF, OVERSHOOT_OF, OVERSHOOTS, sampleTrack } from './anim';
import type { Curve, Keyframe, Overshoot } from './anim';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The span of values a lane is drawn across. */
export interface Range {
  lo: number;
  hi: number;
}

/** Room left above and below the values, as a fraction of their span — so a
 *  curve that overshoots its keys has somewhere to overshoot into rather than
 *  being clipped at the box's edge. */
const PAD = 0.18;

/**
 * The range a track is drawn in: its own values, padded.
 *
 * Per lane rather than shared, which is what lets a rotation in degrees and an
 * opacity in hundredths sit in one box without either flattening the other. It
 * means the vertical axis says something different for each lane — so the
 * focused lane is the one whose numbers are printed beside it.
 */
export function laneRange(keys: Keyframe[]): Range {
  let lo = Infinity;
  let hi = -Infinity;
  for (const key of keys) {
    lo = Math.min(lo, key.v);
    hi = Math.max(hi, key.v);
  }
  // What the curves actually reach *between* the keys, which for an overshoot is
  // past both of them. Without this the box is fitted to the key values and an
  // overshoot is drawn outside it — clipped by the SVG, so the one part of the
  // motion you turned it on to look at is the part you cannot see.
  //
  // The extremum is solved rather than sampled: it is a quadratic root, so it is
  // exact and costs the same as one sample. The convex hull of the control
  // points would have been cheaper still and much looser — a handle at 1.56
  // bounds the curve at 1.56 where it really reaches 1.10, and the graph would
  // be squashed into the half of the box the motion never visits.
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const dv = b.v - a.v;
    if (dv === 0) continue;
    const span = curveExtent(curveOf(a));
    lo = Math.min(lo, a.v + span.lo * dv, a.v + span.hi * dv);
    hi = Math.max(hi, a.v + span.lo * dv, a.v + span.hi * dv);
  }
  if (!Number.isFinite(lo)) return { lo: 0, hi: 1 };
  // A track that holds one value everywhere has no span to fit. Give it one, so
  // it draws as a line through the middle instead of dividing by zero.
  if (hi - lo < 1e-9) {
    const pad = Math.max(0.5, Math.abs(hi) * 0.1);
    return { lo: lo - pad, hi: hi + pad };
  }
  const pad = (hi - lo) * PAD;
  return { lo: lo - pad, hi: hi + pad };
}

/**
 * How far a curve's progress actually travels, as the fractions of its segment
 * it reaches. `{ lo: 0, hi: 1 }` for anything that stays inside its keys; wider
 * on both counts for an overshoot.
 *
 * The curve is `B(s) = 3(1-s)²s·oy + 3(1-s)s²·iy + s³`, since the segment runs
 * from 0 to 1 — so its turning points are the roots of a quadratic and there is
 * no reason to go looking for them by sampling. **The parameter is the bezier's
 * own, not time**, which is exactly right: `sampleCurve` solves x for that
 * parameter and then reads y off it, so the set of values the segment takes is
 * the set this walks, whatever the handles do to the timing.
 *
 * The ends are always included, so a monotonic curve comes back as the unit
 * range and every caller that predates overshoot reads what it always did.
 */
export function curveExtent(c: Curve): Range {
  let lo = 0;
  let hi = 1;
  const take = (s: number) => {
    if (s <= 0 || s >= 1) return; // the ends are already in
    const u = 1 - s;
    const v = 3 * u * u * s * c.oy + 3 * u * s * s * c.iy + s * s * s;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  };
  // B'(s) / 3, as a quadratic in s.
  const a = 3 * c.oy - 3 * c.iy + 1;
  const b = 2 * c.iy - 4 * c.oy;
  const k = c.oy;
  if (Math.abs(a) < 1e-12) {
    // Linear derivative — one turning point, or none where it is constant too.
    if (Math.abs(b) > 1e-12) take(-k / b);
  } else {
    const disc = b * b - 4 * a * k;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      take((-b + root) / (2 * a));
      take((-b - root) / (2 * a));
    }
  }
  return { lo, hi };
}

/** A value as a 0..1 height in its lane's range. 0 is the bottom of the box. */
export const norm = (r: Range, v: number): number => (v - r.lo) / (r.hi - r.lo || 1);

/** And back, for a handle or a key that has just been dragged. */
export const denorm = (r: Range, n: number): number => r.lo + n * (r.hi - r.lo);

/** A point on the graph, in the units the graph is *about* — seconds across,
 *  the property's own value up. Turning that into pixels is the component's. */
export interface GraphPoint {
  t: number;
  v: number;
}

/** The curve a key hands the segment leaving it, as handles: its own if it has
 *  been shaped, otherwise the one its named easing stands for. */
export const curveOf = (key: Keyframe): Curve => key.curve ?? CURVE_OF[key.ease ?? 'linear'];

/**
 * The two control points of the segment from `a` to `b`, as points on the graph.
 *
 * Both live on `a` — Lottie's arrangement, kept — but they are drawn at opposite
 * ends of the segment: `out` hangs off `a` and `in` reaches back from `b`, which
 * is how a pair of bezier handles reads and what makes the two independently
 * grabbable.
 *
 * A **flat** segment is the one case with no vertical meaning: both keys hold
 * the same value, so no `oy` draws differently from any other. The handles are
 * placed on the line and stay draggable in time alone, which is the whole of
 * what a flat segment's curve can express.
 */
export function handlesOf(a: Keyframe, b: Keyframe): { out: GraphPoint; in: GraphPoint } {
  const c = curveOf(a);
  const dt = b.t - a.t;
  const dv = b.v - a.v;
  return {
    out: { t: a.t + c.ox * dt, v: a.v + c.oy * dv },
    in: { t: a.t + c.ix * dt, v: a.v + c.iy * dv },
  };
}

/** How far a handle may be pulled past its own segment vertically. Time is
 *  clamped to the segment — a control point outside it makes the curve run
 *  backwards, which has no meaning for a value over time — but value is not, so
 *  a curve can overshoot and settle back. */
const MAX_OVERSHOOT = 1.6;

/**
 * The curve a dragged handle leaves behind: the point put back into the
 * fractions Lottie stores, with the other handle left exactly as it was.
 */
export function curveFromHandle(
  a: Keyframe,
  b: Keyframe,
  which: 'out' | 'in',
  point: GraphPoint,
): Curve {
  const c = curveOf(a);
  const dt = b.t - a.t;
  const dv = b.v - a.v;
  const x = dt === 0 ? 0 : clamp((point.t - a.t) / dt, 0, 1);
  // A flat segment keeps whatever it had: see `handlesOf`.
  const y =
    Math.abs(dv) < 1e-9
      ? which === 'out'
        ? c.oy
        : c.iy
      : clamp((point.v - a.v) / dv, -MAX_OVERSHOOT, 1 + MAX_OVERSHOOT);
  return which === 'out' ? { ...c, ox: x, oy: y } : { ...c, ix: x, iy: y };
}

/**
 * The track drawn, as points across the visible window.
 *
 * Sampled through `sampleTrack` rather than evaluated per segment, so the line
 * is the same answer the stage paints — including the flat runs past the first
 * and last key, and the vertical step a held key makes. `easeOf` is imported for
 * the same reason it exists: one curve, read one way.
 */
export function trackPoints(
  keys: Keyframe[],
  from: number,
  to: number,
  steps: number,
): GraphPoint[] {
  if (keys.length === 0) return [];
  const times: number[] = [];
  for (let n = 0; n <= steps; n++) times.push(from + ((to - from) * n) / steps);
  // Every key is sampled exactly, and twice: once for the value arriving at it
  // and once for the value leaving. That is what makes a held key draw as a
  // step rather than as a steep diagonal between two grid samples.
  for (const key of keys) {
    if (key.t > from && key.t < to) times.push(key.t - 1e-6, key.t);
  }
  times.sort((a, b) => a - b);
  return times.map((t) => ({ t, v: sampleTrack(keys, t, keys[0].v) }));
}

/** Whether a key's own curve was shaped by hand — what the editor marks, so a
 *  key carrying a default is visibly a default. */
export const isShaped = (key: Keyframe): boolean => key.curve !== undefined;

/**
 * Which overshoot preset a key is carrying, if it is carrying one exactly.
 *
 * Compared against the table rather than tested for "does it leave the unit
 * square", and the difference matters: a curve dragged out there by hand is a
 * real overshoot but it is nobody's preset, so the control marks none of them
 * and leaves the handles to say what the curve is. Reporting the nearest preset
 * would light a chip that does not describe the curve, and pressing it would
 * silently throw the hand-shaped one away.
 */
export function overshootOf(key: Keyframe): Overshoot | null {
  const c = key.curve;
  if (!c) return null;
  for (const { id } of OVERSHOOTS) {
    const p = OVERSHOOT_OF[id];
    if (c.ox === p.ox && c.oy === p.oy && c.ix === p.ix && c.iy === p.iy) return id;
  }
  return null;
}
