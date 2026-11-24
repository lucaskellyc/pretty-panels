import type { FontProject, Point, StrokePath } from './font/model';
import { shapedGlyph } from './font/stretch';
import { canvasScene, type CanvasSettings, type SceneLetter } from './Canvas';
import { frameAt } from './timeline/timecode';

/**
 * The canvas as a Lottie (Bodymovin JSON) animation, sampled frame by frame.
 *
 * Everything the canvas animates — weight, widths, offsets, trims, write-on,
 * staggers — is resolved per frame exactly as the stage draws it, so the file
 * plays back what the studio shows without Lottie having to know any of it.
 * Each letter is a shape layer holding its geometry for a run of frames: a
 * letter that holds still is one layer, and a moving one a layer per frame
 * it changes on. Strokes stay strokes (width, caps and joins), pen contours
 * are fills.
 *
 * With `transparent` set there is no background layer at all, so the file
 * composites over whatever it's placed on.
 */

type Vec = [number, number];
type Shape = Record<string, unknown>;

/** Two decimals of a pixel: well under what a player can show, and it keeps
 *  the file small. */
const r = (n: number) => Math.round(n * 100) / 100;

const still = (k: unknown) => ({ a: 0, k });

const rgba = (hex: string): number[] => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

const GROUP_TRANSFORM: Shape = {
  ty: 'tr',
  p: still([0, 0]),
  a: still([0, 0]),
  s: still([100, 100]),
  r: still(0),
  o: still(100),
  sk: still(0),
  sa: still(0),
};

const LAYER_TRANSFORM = {
  o: still(100),
  r: still(0),
  p: still([0, 0, 0]),
  a: still([0, 0, 0]),
  s: still([100, 100, 100]),
};

/** Lottie's codes: caps 1 butt / 2 round / 3 square, joins 1 miter / 2 round / 3 bevel. */
const CAP = { round: 2, square: 3 } as const;
const JOIN = { miter: 1, round: 2, bevel: 3 } as const;

/** A path in Lottie's form: vertices, with tangents relative to them. */
function pathShape(v: Vec[], i: Vec[], o: Vec[], closed: boolean): Shape {
  return { ty: 'sh', ks: still({ i, o, v, c: closed }) };
}

function strokeShape(stroke: StrokePath, at: (p: Point) => Vec): Shape {
  const v: Vec[] = [at(stroke.start)];
  const i: Vec[] = [[0, 0]];
  const o: Vec[] = [[0, 0]];
  for (const seg of stroke.segments) {
    const to = at(seg.to);
    if (seg.type === 'C') {
      const from = v[v.length - 1];
      const c1 = at(seg.c1);
      const c2 = at(seg.c2);
      o[o.length - 1] = [r(c1[0] - from[0]), r(c1[1] - from[1])];
      i.push([r(c2[0] - to[0]), r(c2[1] - to[1])]);
    } else i.push([0, 0]);
    o.push([0, 0]);
    v.push(to);
  }
  return pathShape(v, i, o, stroke.closed);
}

/** One letter's shapes, in frame pixels — empty when nothing of it is drawn. */
function letterShapes(letter: SceneLetter, color: number[]): Shape[] {
  const g = shapedGlyph(letter.glyph, letter.stretch);
  const s = letter.scale;
  const at = (p: Point): Vec => [r(letter.x + p.x * s), r(letter.y - p.y * s)];
  const shapes: Shape[] = [];

  const strokes = (g.strokes ?? []).filter((st) => st.segments.length > 0);
  if (strokes.length && letter.weight > 0) {
    shapes.push({
      ty: 'gr',
      nm: 'Strokes',
      it: [
        ...strokes.map((st) => strokeShape(st, at)),
        {
          ty: 'st',
          c: still(color),
          o: still(100),
          w: still(r(letter.weight * s)),
          lc: CAP[g.cap ?? 'round'],
          lj: JOIN[g.join ?? 'round'],
          ml: 4,
        },
        GROUP_TRANSFORM,
      ],
    });
  }

  const contours = g.contours.filter((c) => c.points.length >= 3);
  if (contours.length) {
    shapes.push({
      ty: 'gr',
      nm: 'Fills',
      it: [
        ...contours.map((c) => {
          const v = c.points.map(at);
          const zero = v.map((): Vec => [0, 0]);
          return pathShape(v, zero, zero.slice(), true);
        }),
        // Nonzero, as the font fills them.
        { ty: 'fl', c: still(color), o: still(100), r: 1 },
        GROUP_TRANSFORM,
      ],
    });
  }
  return shapes;
}

export interface LottieRange {
  fps: number;
  /** Seconds: the first frame exported, and the end (exclusive). */
  start: number;
  end: number;
}

/** The canvas over `range`, as a Lottie document. `resolveAt` gives the
 *  project at any time, as the stage uses it. */
export function canvasLottie(
  resolveAt: (t: number) => FontProject,
  settings: CanvasSettings,
  range: LottieRange,
  name: string,
): object {
  const { fps } = range;
  const first = frameAt(range.start, fps);
  const frames = Math.max(1, frameAt(range.end, fps) - first);
  const color = rgba(settings.textColor);

  /** The open run of identical frames per letter, and the finished layers. */
  const open = new Map<number, { char: string; sig: string; shapes: Shape[]; from: number }>();
  const done: { key: number; char: string; shapes: Shape[]; from: number; to: number }[] = [];
  const close = (key: number, to: number) => {
    const run = open.get(key);
    if (!run) return;
    open.delete(key);
    done.push({ key, char: run.char, shapes: run.shapes, from: run.from, to });
  };

  for (let f = 0; f < frames; f++) {
    const t = (first + f) / fps;
    const seen = new Set<number>();
    for (const letter of canvasScene(resolveAt(t), resolveAt, t, settings)) {
      const shapes = letterShapes(letter, color);
      if (!shapes.length) continue;
      seen.add(letter.key);
      const sig = JSON.stringify(shapes);
      const run = open.get(letter.key);
      if (run?.sig === sig) continue;
      close(letter.key, f);
      open.set(letter.key, { char: letter.char, sig, shapes, from: f });
    }
    for (const key of [...open.keys()]) if (!seen.has(key)) close(key, f);
  }
  for (const key of [...open.keys()]) close(key, frames);

  // Earlier letters on top, as later ones are drawn first in a Lottie stack;
  // the order only shows where letters overlap.
  done.sort((a, b) => a.key - b.key || a.from - b.from);
  const layers: object[] = done.map((run, n) => ({
    ddd: 0,
    ind: n + 1,
    ty: 4,
    nm: `${run.char} ${run.from}`,
    sr: 1,
    ks: LAYER_TRANSFORM,
    ao: 0,
    shapes: run.shapes,
    ip: run.from,
    op: run.to,
    st: 0,
    bm: 0,
  }));

  if (!settings.transparent) {
    layers.push({
      ddd: 0,
      ind: layers.length + 1,
      ty: 1,
      nm: 'Background',
      sr: 1,
      ks: LAYER_TRANSFORM,
      ao: 0,
      sc: settings.background,
      sw: settings.frameWidth,
      sh: settings.frameHeight,
      ip: 0,
      op: frames,
      st: 0,
      bm: 0,
    });
  }

  return {
    v: '5.7.4',
    fr: fps,
    ip: 0,
    op: frames,
    w: settings.frameWidth,
    h: settings.frameHeight,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
}

/** Hand the file to the browser as a download. */
export function exportLottie(
  resolveAt: (t: number) => FontProject,
  settings: CanvasSettings,
  range: LottieRange,
  project: FontProject,
): void {
  const part = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '') || 'Untitled';
  const name = `${part(project.familyName)}-${part(project.styleName)}`;
  const json = JSON.stringify(canvasLottie(resolveAt, settings, range, name));
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
