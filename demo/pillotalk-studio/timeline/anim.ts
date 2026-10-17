/**
 * The keyframe model: a set of numeric channels, each optionally carrying a
 * track of keys that overrides its static (base) value over time.
 *
 * Ported from motion-studio's types/animate/edit, minus everything that was
 * about layers and shapes: here a channel is just a name, and the base values
 * live in the scene settings store. Every edit is a pure `(doc, …) => doc`, and
 * returns the same doc when nothing changed so callers can test by identity.
 */
import { frameAt, snapToFrame } from './timecode';

/** The curve *leaving* a keyframe, toward the next one. */
export type Easing = 'linear' | 'ease' | 'hold';

/**
 * A hand-shaped curve leaving a keyframe: two control points of a cubic bezier
 * over the unit square, `o` leaving this key and `i` arriving at the next one
 * (Lottie's arrangement). Where present it overrides `Keyframe.ease`.
 */
export interface Curve {
  ox: number;
  oy: number;
  ix: number;
  iy: number;
}

/** The named curves as handles — what the graph editor starts from when an
 *  unshaped key is first grabbed. `hold` has no arc, so it seeds the diagonal. */
export const CURVE_OF: Record<Easing, Curve> = {
  linear: { ox: 1 / 3, oy: 1 / 3, ix: 2 / 3, iy: 2 / 3 },
  ease: { ox: 1 / 3, oy: 0, ix: 2 / 3, iy: 1 },
  hold: { ox: 1 / 3, oy: 1 / 3, ix: 2 / 3, iy: 2 / 3 },
};

/** A segment that runs past its destination and/or pulls back first. */
export type Overshoot = 'anticipate' | 'overshoot' | 'both';

/** The canonical `back` easings (CSS easeInBack / easeOutBack / easeInOutBack). */
export const OVERSHOOT_OF: Record<Overshoot, Curve> = {
  anticipate: { ox: 0.36, oy: 0, ix: 0.66, iy: -0.56 },
  overshoot: { ox: 0.34, oy: 1.56, ix: 0.64, iy: 1 },
  both: { ox: 0.68, oy: -0.6, ix: 0.32, iy: 1.6 },
};

export const OVERSHOOTS: Array<{ id: Overshoot; label: string; hint: string }> = [
  { id: 'anticipate', label: 'Anticipate', hint: 'Pull back, then go' },
  { id: 'overshoot', label: 'Overshoot', hint: 'Run past, then settle' },
  { id: 'both', label: 'Both', hint: 'Pull back, run past, settle' },
];

export interface Keyframe {
  /** Seconds from the start of the timeline. */
  t: number;
  v: number;
  /** Curve from this key to the next. Defaults to 'linear'. */
  ease?: Easing;
  /** The same curve, shaped by hand in the graph editor. Overrides `ease`. */
  curve?: Curve;
}

/** The animation document: timing plus one ascending key list per armed channel. */
export interface AnimDoc<P extends string = string> {
  fps: number;
  /** Length in seconds. */
  duration: number;
  /** Armed channels only — a channel with no entry reads its base value. */
  tracks: Partial<Record<P, Keyframe[]>>;
}

/** New keys are written with the soft curve: hand-placed keys almost always
 *  want easing. */
export const DEFAULT_EASE: Easing = 'ease';

/* ---- Sampling -------------------------------------------------------------- */

const CURVES: Record<Easing, (p: number) => number> = {
  linear: (p) => p,
  ease: (p) => p * p * (3 - 2 * p), // smoothstep
  hold: () => 0,
};

// One coordinate of the cubic with the fixed endpoints folded in, and its slope.
const bez = (a: number, b: number, t: number): number => {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
};
const dbez = (a: number, b: number, t: number): number => {
  const u = 1 - t;
  return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b);
};

/** Solve x(t) = p: Newton first (2–3 steps for drawable curves), then bisection
 *  as the guaranteed fallback where a flat handle makes the slope vanish. */
const solveX = (ox: number, ix: number, p: number): number => {
  let t = p;
  for (let n = 0; n < 6; n++) {
    const err = bez(ox, ix, t) - p;
    if (Math.abs(err) < 1e-6) return t;
    const d = dbez(ox, ix, t);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  let lo = 0;
  let hi = 1;
  t = p;
  for (let n = 0; n < 24; n++) {
    const x = bez(ox, ix, t);
    if (Math.abs(x - p) < 1e-6) break;
    if (x < p) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return t;
};

/** Progress along a hand-shaped curve at fraction `p` of the segment — what CSS
 *  `cubic-bezier()` means. Only x is clamped; y stays free so curves overshoot. */
export function sampleCurve(curve: Curve, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const ox = Math.max(0, Math.min(1, curve.ox));
  const ix = Math.max(0, Math.min(1, curve.ix));
  return bez(curve.oy, curve.iy, solveX(ox, ix, p));
}

export const easeOf = (key: { ease?: Easing; curve?: Curve }): ((p: number) => number) =>
  key.curve ? (p) => sampleCurve(key.curve as Curve, p) : CURVES[key.ease ?? 'linear'];

/** A track's value at `t`, holding flat outside its first/last key. */
export function sampleTrack(keys: Keyframe[], t: number, fallback: number): number {
  if (keys.length === 0) return fallback;
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  // `>=`: a time exactly on `b` belongs to the segment after it, so a held key
  // releases on its own frame rather than one frame late.
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= b.t) continue;
    const span = b.t - a.t;
    if (span <= 0) return b.v;
    return a.v + (b.v - a.v) * easeOf(a)((t - a.t) / span);
  }
  return last.v;
}

/* ---- Edits ------------------------------------------------------------------ */

function withTrack<P extends string>(doc: AnimDoc<P>, prop: P, keys: Keyframe[] | null): AnimDoc<P> {
  const tracks = { ...doc.tracks };
  if (keys) tracks[prop] = keys;
  else delete tracks[prop];
  return { ...doc, tracks };
}

/** Insert or replace the key on `t`'s frame, keeping the track sorted. An
 *  existing key keeps its easing; a new one takes `DEFAULT_EASE`. */
function upsert(keys: Keyframe[], t: number, v: number, fps: number): Keyframe[] {
  const frame = frameAt(t, fps);
  const at = keys.findIndex((k) => frameAt(k.t, fps) === frame);
  if (at >= 0) {
    if (keys[at].v === v) return keys;
    const next = keys.slice();
    next[at] = { ...next[at], v };
    return next;
  }
  return [...keys, { t, v, ease: DEFAULT_EASE }].sort((a, b) => a.t - b.t);
}

/** Key an armed channel at `t` (snapped to the frame grid). */
export function setKey<P extends string>(doc: AnimDoc<P>, prop: P, t: number, v: number): AnimDoc<P> {
  const track = doc.tracks[prop];
  if (!track) return doc;
  const keys = upsert(track, snapToFrame(t, doc.fps), v, doc.fps);
  return keys === track ? doc : withTrack(doc, prop, keys);
}

/** Turn the stopwatch on: one key at the playhead carrying the current value,
 *  so arming never changes the frame. */
export function armProp<P extends string>(doc: AnimDoc<P>, prop: P, t: number, v: number): AnimDoc<P> {
  if (doc.tracks[prop]) return doc;
  return withTrack(doc, prop, [{ t: snapToFrame(t, doc.fps), v, ease: DEFAULT_EASE }]);
}

/** Turn the stopwatch off. The caller freezes the base to the value at the
 *  playhead first, so disarming doesn't change the frame either. */
export function disarmProp<P extends string>(doc: AnimDoc<P>, prop: P): AnimDoc<P> {
  return doc.tracks[prop] ? withTrack(doc, prop, null) : doc;
}

/** Shape (or with `null`, un-shape) the curve leaving the key on `t`'s frame. */
export function setKeyCurve<P extends string>(
  doc: AnimDoc<P>,
  prop: P,
  t: number,
  curve: Curve | null,
): AnimDoc<P> {
  const track = doc.tracks[prop];
  if (!track) return doc;
  const frame = frameAt(t, doc.fps);
  return withTrack(
    doc,
    prop,
    track.map((k) => {
      if (frameAt(k.t, doc.fps) !== frame) return k;
      if (curve) return { ...k, curve: { ...curve } };
      const { curve: _gone, ...rest } = k;
      return rest;
    }),
  );
}

/** Remove the key on `t`'s frame. The last key going takes the track with it;
 *  `onEmpty` hears the value that channel read, so its base can be frozen there. */
export function removeKeyAt<P extends string>(
  doc: AnimDoc<P>,
  prop: P,
  t: number,
  onEmpty?: (prop: P, v: number) => void,
): AnimDoc<P> {
  const track = doc.tracks[prop];
  if (!track) return doc;
  const frame = frameAt(t, doc.fps);
  const keys = track.filter((k) => frameAt(k.t, doc.fps) !== frame);
  if (keys.length === track.length) return doc;
  if (keys.length === 0) onEmpty?.(prop, sampleTrack(track, t, 0));
  return withTrack(doc, prop, keys.length ? keys : null);
}

/**
 * Retime the key on `from`'s frame to `to` and optionally revalue it — one edit,
 * so a drag that does both never addresses a key by a time it just changed.
 * The key travels whole (curve included), is clamped to the timeline and
 * snapped, and displaces a key of the same channel already on the target frame.
 */
export function moveKeyTo<P extends string>(
  doc: AnimDoc<P>,
  prop: P,
  from: number,
  to: number,
  v?: number,
): AnimDoc<P> {
  const track = doc.tracks[prop];
  if (!track) return doc;
  const time = snapToFrame(Math.max(0, Math.min(doc.duration, to)), doc.fps);
  const fromFrame = frameAt(from, doc.fps);
  const toFrame = frameAt(time, doc.fps);
  const moved = track.find((k) => frameAt(k.t, doc.fps) === fromFrame);
  if (!moved) return doc;
  const value = v ?? moved.v;
  if (fromFrame === toFrame && moved.v === value && moved.t === time) return doc;
  const keys = track
    .filter((k) => k !== moved && frameAt(k.t, doc.fps) !== toFrame)
    .concat({ ...moved, t: time, v: value })
    .sort((a, b) => a.t - b.t);
  return withTrack(doc, prop, keys);
}

/** The channels in `props` keyed on `t`'s frame — what a merged lane mark stands for. */
export function propsKeyedAt<P extends string>(doc: AnimDoc<P>, props: readonly P[], t: number): P[] {
  const frame = frameAt(t, doc.fps);
  return props.filter((p) => doc.tracks[p]?.some((k) => frameAt(k.t, doc.fps) === frame));
}

/** Every distinct key time across `props`, ascending — what key-stepping walks. */
export function keyTimes<P extends string>(doc: AnimDoc<P>, props: readonly P[]): number[] {
  const times = new Set<number>();
  for (const p of props) for (const k of doc.tracks[p] ?? []) times.add(k.t);
  return [...times].sort((a, b) => a - b);
}
