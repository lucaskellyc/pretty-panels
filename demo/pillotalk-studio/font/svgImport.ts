import { toLineCap, type FontProject, type GlyphData, type LineCap, type LineJoin, type Point, type Segment, type StrokePath } from './model';

/**
 * SVG glyph import. Each file is one glyph, named `<letter>u.svg` for the
 * capital and `<letter>l.svg` for the lowercase (`au.svg` → A, `al.svg` → a).
 *
 * The paths come across **raw**: centrelines with their curves intact, never
 * expanded into outlines. Their stroke width is not baked in either — it
 * becomes the font's `strokeWeight`, which re-strokes every glyph at once.
 *
 * Placement: the files are frames aligned along their top edge, so the height
 * most of them share is the cap height and its bottom edge is the baseline. A
 * taller frame (a `g` with room underneath) keeps its ink on that same baseline
 * and its extra height hangs below. Everything scales by one factor, so the
 * glyphs keep their relative sizes.
 */

/** Space added each side of a frame's width, in font units. */
export const SIDE_BEARING = 40;

export interface ImportFile {
  name: string;
  text: string;
}

export interface ImportResult {
  glyphs: GlyphData[];
  /** Stroke width the files were drawn at, in font units. */
  weight: number | null;
  /** Files whose names don't follow the convention. */
  skipped: string[];
  /** Files that matched but couldn't be read, with why. */
  errors: string[];
}

/** `au.svg` → `A`, `al.svg` → `a`; anything else → null. */
export function charForFile(name: string): string | null {
  const m = /^([a-z])(u|l)\.svg$/i.exec(name.split(/[\\/]/).pop() ?? '');
  if (!m) return null;
  return m[2].toLowerCase() === 'u' ? m[1].toUpperCase() : m[1].toLowerCase();
}

// ---- SVG reading ----------------------------------------------------------

interface SvgStroke {
  d: string;
  width: number;
  cap: LineCap;
  join: LineJoin;
}

interface SvgDoc {
  width: number;
  height: number;
  paths: SvgStroke[];
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

function readSvg(text: string): SvgDoc {
  const root = /<svg\b[^>]*>/.exec(text)?.[0];
  if (!root) throw new Error('no <svg> element');
  const vb = attr(root, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  const width = vb?.[2] ?? Number(attr(root, 'width'));
  const height = vb?.[3] ?? Number(attr(root, 'height'));
  if (!(width > 0 && height > 0)) throw new Error('no usable viewBox');
  if ((vb?.[0] ?? 0) !== 0 || (vb?.[1] ?? 0) !== 0) throw new Error('viewBox must start at 0 0');
  if (/\stransform="/.test(text)) throw new Error('transforms are not supported');

  // Presentation attributes can sit on the path or any ancestor; the nearest
  // one wins. These exports are flat (svg › g › path), so look path-first, then
  // at every opening tag before it.
  const tags = [...text.matchAll(/<(svg|g|path)\b[^>]*>/g)].map((m) => m[0]);
  const paths: SvgStroke[] = [];
  tags.forEach((tag, i) => {
    if (!tag.startsWith('<path')) return;
    const look = (name: string) => {
      for (let j = i; j >= 0; j--) {
        const v = attr(tags[j], name);
        if (v !== undefined) return v;
      }
      return undefined;
    };
    const d = attr(tag, 'd');
    if (!d) return;
    if ((look('stroke') ?? 'none') === 'none') throw new Error('a path has no stroke — expected stroked centrelines');
    paths.push({
      d,
      width: Number(look('stroke-width') ?? 1),
      cap: toLineCap(look('stroke-linecap')),
      join: (look('stroke-linejoin') as LineJoin) ?? 'miter',
    });
  });
  if (!paths.length) throw new Error('no paths');
  return { width, height, paths };
}

/** Path data → subpaths in SVG units. Every command, absolute or relative,
 *  except arcs; quadratics are raised to cubics, so nothing is approximated. */
export function parsePathData(d: string): StrokePath[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const out: StrokePath[] = [];
  let i = 0;
  let cmd = '';
  let cur: Point = { x: 0, y: 0 };
  let startPt: Point = cur;
  let path: StrokePath | null = null;
  let lastC2: Point | null = null; // for S
  let lastQ: Point | null = null; // for T

  const num = () => {
    const t = tokens[i++];
    if (t === undefined || /[a-zA-Z]/.test(t)) throw new Error(`bad path data near "${cmd}"`);
    return Number(t);
  };
  const pt = (rel: boolean): Point => {
    const x = num();
    const y = num();
    return rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
  };
  const push = (seg: Segment) => {
    if (!path) {
      path = { start: cur, segments: [], closed: false };
      out.push(path);
    }
    path.segments.push(seg);
    cur = seg.to;
  };
  const quad = (q: Point, to: Point) =>
    push({
      type: 'C',
      c1: { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) },
      c2: { x: to.x + (2 / 3) * (q.x - to.x), y: to.y + (2 / 3) * (q.y - to.y) },
      to,
    });

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) throw new Error('path data must start with a command');
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();
    let c2: Point | null = null;
    let q: Point | null = null;

    switch (c) {
      case 'M': {
        cur = pt(rel);
        startPt = cur;
        path = { start: cur, segments: [], closed: false };
        out.push(path);
        cmd = rel ? 'l' : 'L'; // further pairs are implicit linetos
        break;
      }
      case 'L':
        push({ type: 'L', to: pt(rel) });
        break;
      case 'H': {
        const x = num();
        push({ type: 'L', to: { x: rel ? cur.x + x : x, y: cur.y } });
        break;
      }
      case 'V': {
        const y = num();
        push({ type: 'L', to: { x: cur.x, y: rel ? cur.y + y : y } });
        break;
      }
      case 'C': {
        const c1 = pt(rel);
        c2 = pt(rel);
        const to = pt(rel);
        push({ type: 'C', c1, c2, to });
        break;
      }
      case 'S': {
        const c1 = lastC2 ? { x: 2 * cur.x - lastC2.x, y: 2 * cur.y - lastC2.y } : cur;
        c2 = pt(rel);
        const to = pt(rel);
        push({ type: 'C', c1, c2, to });
        break;
      }
      case 'Q': {
        q = pt(rel);
        quad(q, pt(rel));
        break;
      }
      case 'T': {
        q = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur;
        quad(q, pt(rel));
        break;
      }
      case 'Z': {
        if (path) path.closed = true;
        cur = startPt;
        path = null;
        break;
      }
      case 'A':
        throw new Error('arc commands are not supported — convert arcs to curves first');
      default:
        throw new Error(`unknown path command "${cmd}"`);
    }
    lastC2 = c2;
    lastQ = q;
  }
  return out.filter((p) => p.segments.length > 0);
}

// ---- placement ------------------------------------------------------------

/** The most common value, ties to the larger. */
function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function importSvgs(files: ImportFile[], project: FontProject): ImportResult {
  const skipped: string[] = [];
  const errors: string[] = [];
  const read: { char: string; doc: SvgDoc; name: string }[] = [];

  for (const f of files) {
    const char = charForFile(f.name);
    if (!char) {
      skipped.push(f.name);
      continue;
    }
    try {
      read.push({ char, doc: readSvg(f.text), name: f.name });
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!read.length) return { glyphs: [], weight: null, skipped, errors };

  const baseline = mode(read.map((r) => r.doc.height));
  const s = project.capHeight / baseline;
  const map = (p: Point): Point => ({ x: round2(SIDE_BEARING + p.x * s), y: round2((baseline - p.y) * s) });

  const glyphs: GlyphData[] = [];
  for (const { char, doc, name } of read) {
    try {
      const strokes = doc.paths.flatMap((p) =>
        parsePathData(p.d).map((sp) => ({
          start: map(sp.start),
          closed: sp.closed,
          segments: sp.segments.map((g): Segment =>
            g.type === 'L' ? { type: 'L', to: map(g.to) } : { type: 'C', c1: map(g.c1), c2: map(g.c2), to: map(g.to) },
          ),
        })),
      );
      glyphs.push({
        char,
        advanceWidth: Math.round(doc.width * s + SIDE_BEARING * 2),
        contours: [],
        strokes,
        cap: doc.paths[0].cap,
        join: doc.paths[0].join,
      });
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const weight = Math.round(mode(read.flatMap((r) => r.doc.paths.map((p) => p.width))) * s);
  return { glyphs, weight, skipped, errors };
}
