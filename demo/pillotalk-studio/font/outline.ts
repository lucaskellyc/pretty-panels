import ClipperLib from 'clipper-lib';
import type { GlyphData, LineCap, LineJoin, Point, StrokePath } from './model';

/**
 * Stroke expansion, for export only. A font can only hold filled outlines, so
 * at build time each centreline is flattened, offset by half the weight with
 * its caps and joins, and unioned with the glyph's pen contours. The source
 * paths are never touched — this runs on a copy every time the font is built.
 */

/** Clipper works in integers; this many per font unit. */
const SCALE = 100;
/** Largest distance, in font units, a flattened curve or round cap may sit
 *  from the true one. Well under the 1-unit rounding the font itself applies. */
const TOLERANCE = 0.35;
/** SVG's default miter limit, in Clipper's terms (a multiple of the offset). */
const MITER_LIMIT = 4;

const JOIN: Record<LineJoin, ClipperLib.JoinType> = {
  round: ClipperLib.JoinType.jtRound,
  miter: ClipperLib.JoinType.jtMiter,
  bevel: ClipperLib.JoinType.jtSquare,
};
const END: Record<LineCap, ClipperLib.EndType> = {
  round: ClipperLib.EndType.etOpenRound,
  square: ClipperLib.EndType.etOpenSquare,
};

/** One cubic as a polyline, subdivided until it is within TOLERANCE. */
function flattenCubic(p0: Point, c1: Point, c2: Point, p3: Point, out: Point[], depth = 0) {
  // Distance of the control points from the chord bounds the curve's.
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const d1 = Math.abs((c1.x - p0.x) * dy - (c1.y - p0.y) * dx) / len;
  const d2 = Math.abs((c2.x - p0.x) * dy - (c2.y - p0.y) * dx) / len;
  if (depth >= 12 || Math.max(d1, d2) <= TOLERANCE) {
    out.push(p3);
    return;
  }
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const a = mid(p0, c1), b = mid(c1, c2), c = mid(c2, p3);
  const ab = mid(a, b), bc = mid(b, c), m = mid(ab, bc);
  flattenCubic(p0, a, ab, m, out, depth + 1);
  flattenCubic(m, bc, c, p3, out, depth + 1);
}

export function flatten(path: StrokePath): Point[] {
  const pts: Point[] = [path.start];
  let cur = path.start;
  for (const g of path.segments) {
    if (g.type === 'L') pts.push(g.to);
    else flattenCubic(cur, g.c1, g.c2, g.to, pts);
    cur = g.to;
  }
  return pts;
}

/** The ink's horizontal extent at `weight`, or null for an empty glyph: the
 *  flattened centrelines padded by half the weight, and the pen contours. */
export function inkBounds(glyph: GlyphData, weight: number): { xMin: number; xMax: number } | null {
  let xMin = Infinity;
  let xMax = -Infinity;
  const take = (pts: Point[], pad: number) => {
    for (const p of pts) {
      xMin = Math.min(xMin, p.x - pad);
      xMax = Math.max(xMax, p.x + pad);
    }
  };
  for (const s of glyph.strokes ?? []) if (s.segments.length) take(flatten(s), weight / 2);
  for (const c of glyph.contours) if (c.points.length >= 3) take(c.points, 0);
  return xMin <= xMax ? { xMin, xMax } : null;
}

const toInt = (pts: Point[]): ClipperLib.Path => pts.map((p) => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));

/** The glyph as filled outlines: strokes expanded at `weight`, pen contours
 *  added, all unioned. Outer contours run counter-clockwise and counters
 *  clockwise (y up) — the direction CFF expects. */
export function glyphOutlines(glyph: GlyphData, weight: number): Point[][] {
  const subjects: ClipperLib.Paths = [];

  const strokes = (glyph.strokes ?? []).filter((s) => s.segments.length > 0);
  if (strokes.length && weight > 0) {
    const co = new ClipperLib.ClipperOffset(MITER_LIMIT, TOLERANCE * SCALE);
    const join = JOIN[glyph.join ?? 'round'];
    const end = END[glyph.cap ?? 'round'];
    for (const s of strokes) {
      co.AddPath(toInt(flatten(s)), join, s.closed ? ClipperLib.EndType.etClosedLine : end);
    }
    const expanded: ClipperLib.Paths = [];
    co.Execute(expanded, (weight / 2) * SCALE);
    subjects.push(...expanded);
  }

  for (const c of glyph.contours) if (c.points.length >= 3) subjects.push(toInt(c.points));
  if (!subjects.length) return [];

  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(subjects, ClipperLib.PolyType.ptSubject, true);
  const tree = new ClipperLib.PolyTree();
  clipper.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

  const result: Point[][] = [];
  const walk = (node: ClipperLib.PolyNode) => {
    for (const child of node.Childs()) {
      let path = ClipperLib.Clipper.CleanPolygon(child.Contour(), 0.2 * SCALE);
      if (path.length >= 3) {
        // In y-up space Clipper's positive orientation is counter-clockwise.
        if (ClipperLib.Clipper.Orientation(path) === child.IsHole()) path = path.slice().reverse();
        result.push(path.map((p) => ({ x: p.X / SCALE, y: p.Y / SCALE })));
      }
      walk(child);
    }
  };
  walk(tree);
  return result;
}
