import type { GlyphData, Point, Segment, StrokePath } from './model';

/**
 * Trim paths, after After Effects': a glyph's stroke paths drawn only between
 * a start and an end, as percentages of their length, with an offset that
 * slides that window along them (wrapping round the end).
 *
 * The paths are trimmed *sequentially* — taken in drawing order as one line —
 * so animating the end from 0 to 100 writes the letter out stroke by stroke.
 * The cut is made on the geometry itself (curves split exactly, not dashed),
 * which is what lets the stage, the preview and the exported font all agree:
 * each draws the trimmed glyph exactly as it draws any other.
 *
 * Pen contours are filled shapes, not lines, and are left whole.
 */

/** Samples per cubic for the arc-length table. */
const LUT_STEPS = 32;
const EPS = 1e-6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** The trim a glyph carries, as fractions, with the defaults filled in. */
export function trimOf(glyph: GlyphData): { start: number; end: number; offset: number } {
  return {
    start: clamp(glyph.trimStart ?? 0, 0, 100) / 100,
    end: clamp(glyph.trimEnd ?? 100, 0, 100) / 100,
    offset: (glyph.trimOffset ?? 0) / 100,
  };
}

/** One segment of a stroke, with where it starts and an arc-length table. */
interface Part {
  from: Point;
  seg: Segment;
  len: number;
  /** Cumulative length at t = i / LUT_STEPS (cubics only). */
  lut?: number[];
}

function cubicAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

/** A stroke's segments, with a closed one's closing line made explicit. */
function partsOf(stroke: StrokePath): Part[] {
  const parts: Part[] = [];
  let cur = stroke.start;
  const segs = stroke.segments.slice();
  const last = segs.length ? segs[segs.length - 1].to : stroke.start;
  if (stroke.closed && dist(last, stroke.start) > EPS) segs.push({ type: 'L', to: stroke.start });
  for (const seg of segs) {
    if (seg.type === 'L') parts.push({ from: cur, seg, len: dist(cur, seg.to) });
    else {
      const lut = [0];
      let prev = cur;
      for (let i = 1; i <= LUT_STEPS; i++) {
        const p = cubicAt(cur, seg.c1, seg.c2, seg.to, i / LUT_STEPS);
        lut.push(lut[i - 1] + dist(prev, p));
        prev = p;
      }
      parts.push({ from: cur, seg, len: lut[LUT_STEPS], lut });
    }
    cur = seg.to;
  }
  return parts;
}

/** The curve parameter `d` along a part. */
function tAt(part: Part, d: number): number {
  if (part.len <= EPS) return 0;
  if (!part.lut) return clamp(d / part.len, 0, 1);
  const lut = part.lut;
  let i = 1;
  while (i < LUT_STEPS && lut[i] < d) i++;
  const span = lut[i] - lut[i - 1];
  return clamp((i - 1 + (span > EPS ? (d - lut[i - 1]) / span : 0)) / LUT_STEPS, 0, 1);
}

/** The piece of a segment between parameters `t0` and `t1`. */
function slice(from: Point, seg: Segment, t0: number, t1: number): { start: Point; seg: Segment } {
  if (seg.type === 'L') return { start: lerp(from, seg.to, t0), seg: { type: 'L', to: lerp(from, seg.to, t1) } };
  // de Casteljau: keep [0, t1], then the [t0/t1, 1] end of that.
  const cut = (p0: Point, c1: Point, c2: Point, p3: Point, t: number, keepLeft: boolean) => {
    const a = lerp(p0, c1, t), b = lerp(c1, c2, t), c = lerp(c2, p3, t);
    const ab = lerp(a, b, t), bc = lerp(b, c, t), m = lerp(ab, bc, t);
    return keepLeft ? [p0, a, ab, m] : [m, bc, c, p3];
  };
  let pts = [from, seg.c1, seg.c2, seg.to];
  if (t1 < 1) pts = cut(pts[0], pts[1], pts[2], pts[3], t1, true);
  const t = t1 > EPS ? t0 / t1 : 0;
  if (t > 0) pts = cut(pts[0], pts[1], pts[2], pts[3], t, false);
  return { start: pts[0], seg: { type: 'C', c1: pts[1], c2: pts[2], to: pts[3] } };
}

/** The open path along a stroke between lengths `u0` and `u1`. */
function between(parts: Part[], u0: number, u1: number): StrokePath | null {
  let start: Point | null = null;
  const segments: Segment[] = [];
  let pos = 0;
  for (const part of parts) {
    const s0 = pos;
    const s1 = pos + part.len;
    pos = s1;
    if (part.len <= EPS || s1 <= u0 || s0 >= u1) continue;
    const t0 = u0 > s0 ? tAt(part, u0 - s0) : 0;
    const t1 = u1 < s1 ? tAt(part, u1 - s0) : 1;
    const piece = slice(part.from, part.seg, t0, t1);
    start ??= piece.start;
    segments.push(piece.seg);
  }
  return start ? { start, segments, closed: false } : null;
}

/** Stroke paths drawn between fractions `start` and `end` of their combined
 *  length, the window slid along by `offset` and wrapped. */
export function trimStrokes(strokes: StrokePath[], start: number, end: number, offset: number): StrokePath[] {
  const lo = Math.min(start, end);
  const span = Math.max(start, end) - lo;
  if (span <= EPS) return [];
  if (span >= 1 - EPS) return strokes;

  const paths = strokes.map((s) => ({ stroke: s, parts: partsOf(s) }));
  const lens = paths.map((p) => p.parts.reduce((n, part) => n + part.len, 0));
  const total = lens.reduce((a, b) => a + b, 0);
  if (total <= EPS) return [];

  // The window in [0, 1), split in two where it runs off the end.
  const from = lo + offset - Math.floor(lo + offset);
  const ranges = from + span <= 1 ? [[from, from + span]] : [[from, 1], [0, from + span - 1]];

  // Each range in drawing order, so a wrapped window reads end-then-start.
  const out: StrokePath[] = [];
  for (const [a, b] of ranges) {
    let pos = 0;
    paths.forEach(({ stroke, parts }, i) => {
      const s0 = pos;
      const s1 = pos + lens[i];
      pos = s1;
      const u0 = Math.max(a * total, s0) - s0;
      const u1 = Math.min(b * total, s1) - s0;
      if (u1 - u0 <= EPS) return;
      // A closed path left whole stays closed, rather than gaining a seam.
      if (stroke.closed && u0 <= EPS && u1 >= lens[i] - EPS) out.push(stroke);
      else {
        const piece = between(parts, u0, u1);
        if (piece) out.push(piece);
      }
    });
  }
  return out;
}

/** The glyph as its trim leaves it — itself when untrimmed, so memoised views
 *  keep their identity. */
export function trimmedGlyph(glyph: GlyphData): GlyphData {
  if (!glyph.strokes?.length) return glyph;
  const { start, end, offset } = trimOf(glyph);
  if (Math.abs(end - start) >= 1 - EPS) return glyph;
  return { ...glyph, strokes: trimStrokes(glyph.strokes, start, end, offset) };
}
