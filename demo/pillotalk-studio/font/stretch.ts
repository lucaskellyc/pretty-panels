import type { Contour, GlyphData, Point, Segment, StrokePath } from './model';
import { flatten } from './outline';
import { trimmedGlyph } from './trim';

/**
 * Height without distortion. A glyph is made taller the way a sign-writer
 * would: cut it across at one height, lift everything above the cut by the
 * stretch, and bridge the gap with straight vertical runs. Nothing is scaled,
 * so a bowl keeps its curve and grows straight sides, a stem simply gets
 * longer, and the stroke stays the font's weight because the centreline is
 * stroked after it has been stretched.
 *
 * A curve crossing the cut is split there exactly; its top half rises whole
 * and a vertical line joins the halves. That join is smooth where the curve
 * runs vertical, so the automatic cut looks for the height where the paths
 * cross the most upright. A straight line crossing the cut just has its top
 * end lifted. A negative stretch drops the top instead, which is clean only
 * as far as the straight runs at the cut can shorten.
 */

const EPS = 1e-6;
/** Steps a cubic is sampled at to find where it crosses the cut. */
const ROOT_STEPS = 32;
/** Heights tried for the automatic cut, across the middle of the ink. */
const CUT_CANDIDATES = 41;
const CUT_BAND = [0.3, 0.7] as const;

const lift = (p: Point, d: number): Point => ({ x: p.x, y: p.y + d });

function cubicAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

/** De Casteljau: the cubic split at `t` into two that trace it exactly. */
function splitCubic(p0: Point, c1: Point, c2: Point, p3: Point, t: number) {
  const l = (a: Point, b: Point): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const a = l(p0, c1), b = l(c1, c2), c = l(c2, p3);
  const ab = l(a, b), bc = l(b, c), m = l(ab, bc);
  return [
    [p0, a, ab, m],
    [m, bc, c, p3],
  ] as const;
}

/** Where along the cubic it changes side of `cut`, in order. */
function crossings(p0: Point, c1: Point, c2: Point, p3: Point, cut: number): number[] {
  const above = (t: number) => cubicAt(p0, c1, c2, p3, t).y >= cut;
  const ts: number[] = [];
  let prev = above(0);
  for (let i = 1; i <= ROOT_STEPS; i++) {
    let hi = i / ROOT_STEPS;
    const side = above(hi);
    if (side === prev) continue;
    let lo = (i - 1) / ROOT_STEPS;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (above(mid) === prev) lo = mid;
      else hi = mid;
    }
    ts.push((lo + hi) / 2);
    prev = side;
  }
  return ts;
}

/** One stroke path stretched by `d` at `cut`. */
function stretchStroke(path: StrokePath, cut: number, d: number): StrokePath {
  const at = (p: Point) => (p.y >= cut ? lift(p, d) : p);
  const segments: Segment[] = [];
  let cur = path.start;
  for (const seg of path.segments) {
    if (seg.type === 'L') {
      segments.push({ type: 'L', to: at(seg.to) });
      cur = seg.to;
      continue;
    }
    let rest = [cur, seg.c1, seg.c2, seg.to] as readonly Point[];
    let up = cur.y >= cut;
    let consumed = 0;
    for (const t of crossings(cur, seg.c1, seg.c2, seg.to, cut)) {
      // Re-map t onto what is left of the curve after earlier splits.
      const [head, tail] = splitCubic(rest[0], rest[1], rest[2], rest[3], (t - consumed) / (1 - consumed));
      const m = up ? d : 0;
      if (t - consumed > EPS) segments.push({ type: 'C', c1: lift(head[1], m), c2: lift(head[2], m), to: lift(head[3], m) });
      // The bridge, from the side just left to the side the curve goes on to.
      segments.push({ type: 'L', to: lift(head[3], up ? 0 : d) });
      consumed = t;
      rest = tail;
      up = !up;
    }
    const m = up ? d : 0;
    segments.push({ type: 'C', c1: lift(rest[1], m), c2: lift(rest[2], m), to: lift(rest[3], m) });
    cur = seg.to;
  }
  return { ...path, start: at(path.start), segments };
}

/** A pen polygon stretched: its points above the cut lifted, so edges across
 *  it lengthen. */
const stretchContour = (c: Contour, cut: number, d: number): Contour => ({
  points: c.points.map((p) => (p.y >= cut ? lift(p, d) : p)),
});

/** Every drawn polyline of the glyph, curves flattened. Closed ones repeat
 *  their start at the end. */
function polylines(glyph: GlyphData): Point[][] {
  const lines: Point[][] = [];
  for (const s of glyph.strokes ?? []) {
    if (!s.segments.length) continue;
    const pts = flatten(s);
    lines.push(s.closed ? [...pts, s.start] : pts);
  }
  for (const c of glyph.contours) if (c.points.length >= 3) lines.push([...c.points, c.points[0]]);
  return lines;
}

/**
 * Where a glyph is cut when it doesn't say: across the middle of its ink, at
 * the height its paths cross most nearly upright, so the vertical bridges
 * meet them smoothly. Ties go to the height nearest the middle. Null for an
 * empty glyph.
 */
export function autoCut(glyph: GlyphData): number | null {
  const lines = polylines(glyph);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const line of lines) for (const p of line) (yMin = Math.min(yMin, p.y)), (yMax = Math.max(yMax, p.y));
  if (!(yMin < yMax)) return null;
  const mid = (yMin + yMax) / 2;
  let best = mid;
  let bestCost = Infinity;
  for (let i = 0; i < CUT_CANDIDATES; i++) {
    const f = CUT_BAND[0] + ((CUT_BAND[1] - CUT_BAND[0]) * i) / (CUT_CANDIDATES - 1);
    const y = Math.round(yMin + (yMax - yMin) * f);
    let cost = 0;
    for (const line of lines) {
      for (let k = 1; k < line.length; k++) {
        const a = line[k - 1], b = line[k];
        if (a.y >= y === b.y >= y) continue;
        // 0 for an upright crossing, 1 for one lying flat.
        cost += Math.abs(b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
      }
    }
    if (cost < bestCost - EPS || (Math.abs(cost - bestCost) <= EPS && Math.abs(y - mid) < Math.abs(best - mid))) {
      best = y;
      bestCost = cost;
    }
  }
  return best;
}

/** The height a glyph is cut at: its own, or the automatic one. */
export const cutOf = (glyph: GlyphData): number | null => glyph.stretchAt ?? autoCut(glyph);

/** The glyph stretched by `d` font units — itself when that's nothing, so
 *  memoised views keep their identity. */
export function stretchedGlyph(glyph: GlyphData, d: number): GlyphData {
  if (Math.abs(d) < EPS) return glyph;
  const cut = cutOf(glyph);
  if (cut === null) return glyph;
  return {
    ...glyph,
    contours: glyph.contours.map((c) => stretchContour(c, cut, d)),
    strokes: glyph.strokes?.map((s) => stretchStroke(s, cut, d)),
  };
}

/** The glyph as every view draws it and the font exports it: stretched by
 *  `stretch`, then trimmed, so a trim runs along the stretched paths. */
export const shapedGlyph = (glyph: GlyphData, stretch = 0): GlyphData => trimmedGlyph(stretchedGlyph(glyph, stretch));
