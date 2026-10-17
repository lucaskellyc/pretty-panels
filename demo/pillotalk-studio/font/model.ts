/**
 * The font as the editor holds it. Everything is in font units with y up —
 * the baseline is y = 0, ascender above, descender below — so export is a
 * straight copy and only the canvas has to flip.
 */

export interface Point {
  x: number;
  y: number;
}

/** A closed polygon of on-curve points. Curves are a later step. */
export interface Contour {
  points: Point[];
}

/** A segment of a stroke path, ending at `to`. */
export type Segment =
  | { type: 'L'; to: Point }
  | { type: 'C'; c1: Point; c2: Point; to: Point };

/**
 * A centreline, kept exactly as drawn or imported — curves and all. It has no
 * width of its own: the font's `strokeWeight` gives it one, so changing the
 * weight re-strokes every glyph. It only becomes a filled outline at export.
 */
export interface StrokePath {
  start: Point;
  segments: Segment[];
  closed: boolean;
}

export type LineCap = 'round' | 'square';

/** Any cap the editor doesn't offer (SVG's `butt`, its default) reads as round. */
export const toLineCap = (v: unknown): LineCap => (v === 'square' ? 'square' : 'round');
export type LineJoin = 'round' | 'miter' | 'bevel';

export interface GlyphData {
  char: string;
  advanceWidth: number;
  /** Filled polygons, drawn with the pen. */
  contours: Contour[];
  /** Stroked centrelines, from SVG import. */
  strokes?: StrokePath[];
  cap?: LineCap;
  join?: LineJoin;
  /** Raises (or, negative, lowers) the whole glyph off the baseline, in font
   *  units. Kept apart from the geometry so it reads back as one number;
   *  applied wherever the glyph is drawn or built. */
  offsetY?: number;
  /** Trim paths (see trim.ts): the stroke paths are drawn only from
   *  `trimStart` to `trimEnd` percent of their length, slid along by
   *  `trimOffset` percent. Unset reads 0 / 100 / 0 — the whole glyph. */
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
}

export interface FontProject {
  familyName: string;
  styleName: string;
  unitsPerEm: number;
  ascender: number;
  /** Negative: below the baseline. */
  descender: number;
  capHeight: number;
  xHeight: number;
  /** Width every stroke path is drawn and exported at, in font units. */
  strokeWeight: number;
  glyphs: Record<string, GlyphData>;
}

export const CHARSET: string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
  ...'.,:;!?\'"-()&@#',
];

export function emptyGlyph(char: string, advanceWidth = 600): GlyphData {
  return { char, advanceWidth, contours: [] };
}

export function createProject(): FontProject {
  return {
    familyName: 'Pillotalk',
    styleName: 'Standard',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
    strokeWeight: 86,
    glyphs: Object.fromEntries(CHARSET.map((c) => [c, emptyGlyph(c)])),
  };
}

/** A glyph counts as drawn once it has a contour that can enclose area, or a
 *  stroke path (which a weight always gives area). */
export function isDrawn(glyph: GlyphData | undefined): boolean {
  return (
    !!glyph &&
    (glyph.contours.some((c) => c.points.length >= 3) || (glyph.strokes ?? []).some((s) => s.segments.length > 0))
  );
}

/** SVG path data for stroke paths, in artboard space (y down, top = ascender). */
export function strokePathData(strokes: StrokePath[] | undefined, ascender: number): string {
  const pt = (p: Point) => `${p.x} ${ascender - p.y}`;
  return (strokes ?? [])
    .map(
      (s) =>
        `M${pt(s.start)}` +
        s.segments.map((g) => (g.type === 'L' ? `L${pt(g.to)}` : `C${pt(g.c1)} ${pt(g.c2)} ${pt(g.to)}`)).join('') +
        (s.closed ? 'Z' : ''),
    )
    .join('');
}

/** The glyph moved sideways by `dx`, points and paths alike. */
export function shiftGlyph(glyph: GlyphData, dx: number): GlyphData {
  const mv = (p: Point): Point => ({ x: p.x + dx, y: p.y });
  return {
    ...glyph,
    contours: glyph.contours.map((c) => ({ points: c.points.map(mv) })),
    strokes: glyph.strokes?.map((s) => ({
      ...s,
      start: mv(s.start),
      segments: s.segments.map((g): Segment =>
        g.type === 'L' ? { type: 'L', to: mv(g.to) } : { type: 'C', c1: mv(g.c1), c2: mv(g.c2), to: mv(g.to) },
      ),
    })),
  };
}

/** Signed area, positive when counter-clockwise (y up). */
export function signedArea(points: Point[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** `U+0041` style label for a character. */
export function codepointLabel(char: string): string {
  return `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
}
